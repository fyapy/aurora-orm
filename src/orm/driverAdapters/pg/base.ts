import type { AbstractClient, AbstractPoolRuntime, OrmLog } from './types.js'
import type { ConnectionConfig } from '../../../types.js'
import type { Tx, QueryConfig } from '../../types.js'
import type { Migrator } from '../types.js'
import {randomUUID} from 'node:crypto'
import {
  type DropConstraint,
  type DefaultColumn,
  type CreateTable,
  type AlterTable,
  type ForeignKey,
  type DropTable,
  type Insert,
  ColumnOperator,
} from '../../../migrator/queryBuilder.js'

const SQLParams = (sql: string) => sql.split('?')
  .reduce((acc, curr, index, arr) => acc += arr.length - 1 === index
    ? curr
    : `${curr}$${index + 1}`, '')

const loadModule = async (config: ConnectionConfig) => {
  const Pool = (await import('pg')).default.Pool

  return new Pool(config) as any as AbstractPoolRuntime
}

export async function basePG(
  config: ConnectionConfig,
  ormLog: OrmLog,
  loadPool = loadModule
) {
  const pool = await loadPool(config)

  const transactions: Record<string, AbstractClient> = {}

  await pool.connect()

  async function prepareDatabase() {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  }

  async function ping() {
    await pool.query('SELECT 1')
  }
  async function end() {
    await pool.end()
  }

  async function queryRow<T = any>(sql: string, values: any[] | null, tx?: Tx, prepare: boolean = false): Promise<T> {
    ormLog(sql, values)
    const client = typeof tx === 'string' ? transactions[tx] : pool

    if (Array.isArray(values)) {
      const res = await client.query(SQLParams(sql), values)

      return ((res as any).command === 'DELETE'
        ? res
        : res.rows[0]) as T
    }

    if (prepare === false) {
      const res = await client.query(sql)

      return res.rows[0] as T
    }

    const res = await client.query({
      text: SQLParams(sql),
      name: sql,
    } as QueryConfig)

    return res.rows[0] as T
  }
  async function query<T = any>(sql: string, values?: any[] | null, tx?: Tx, prepare: boolean = false) {
    ormLog(sql, values)
    const client = typeof tx === 'string' ? transactions[tx] : pool

    if (Array.isArray(values)) {
      if (prepare === false) {
        const res = await client.query(SQLParams(sql), values)

        return res.rows as T[]
      }

      const res = await client.query({
        text: SQLParams(sql),
        name: sql,
        values,
      } as QueryConfig)

      return res.rows as T[]
    }

    const res = await client.query(sql)

    return res.rows as T[]
  }
  async function startTrx(tx?: Tx) {
    if (typeof tx === 'string') {
      return tx
    }

    const id = randomUUID()
    const client = await pool.connect()
    await client.query('BEGIN')
    transactions[id] = client

    return id
  }
  async function commit(tx: Tx) {
    const client = transactions[tx]
    await client.query('COMMIT')
    client.release()
  }
  async function rollback(tx: Tx) {
    const client = transactions[tx]
    await client.query('ROLLBACK')
    client.release()
  }

  function columnDefault(def: string | number | DefaultColumn) {
    switch (typeof def) {
      case 'number':
        return ` DEFAULT ${def}`
      case 'object':
        return ` DEFAULT ${def.sql}`
      case 'string':
        return ` DEFAULT '${def}'`
    }
  }
  function parseCreateTable(ast: CreateTable) {
    let sql = `CREATE TABLE "${ast.table}" (`

    sql += Object.entries(ast.columns)
      .map(([name, opts]) => {
        let column = `"${name}" ${opts.type}`

        if (opts.primary === true) {
          column += ' PRIMARY KEY'
        }
        if (opts.unique === true) {
          column += ' UNIQUE'
        }
        if (opts.notNull === true) {
          column += ' NOT NULL'
        }

        if (typeof opts.default !== 'undefined') {
          column += columnDefault(opts.default)
        }

        return column
      })
      .join(', ')

    sql += ')'
    return sql
  }
  function parseDropTable(ast: DropTable) {
    return `DROP TABLE "${ast.table}"`
  }

  function parseAlterTable(ast: AlterTable) {
    let sql = `ALTER TABLE "${ast.table}"`

    sql += Object.entries(ast.columns)
      .map(([name, opts]) => {
        if (opts.operator === ColumnOperator.AddColumn) {
          let sql = ` ADD COLUMN "${name}" ${opts.type}`

          if (opts.notNull === true) {
            sql += ' NOT NULL'
          }
          if (typeof opts.default !== 'undefined') {
            sql += columnDefault(opts.default)
          }

          return sql
        }
        if (opts.operator === ColumnOperator.DropColumn) {
          return ` DROP COLUMN "${name}"`
        }
        if (opts.operator === ColumnOperator.SetDefault) {
          return ` ALTER COLUMN "${name}" SET${columnDefault(opts.value)}`
        }
        if (opts.operator === ColumnOperator.SetType) {
          return ` ALTER COLUMN "${name}" TYPE ${opts.type}`
        }

        throw new Error('AlterTable AST parse error')
      })
      .join(', ')

    return sql
  }
  function parseForeignKey(ast: ForeignKey) {
    return `ALTER TABLE "${ast.foreign.table}" ADD FOREIGN KEY ("${ast.foreign.key}") REFERENCES "${ast.reference.table}" ("${ast.reference.key}") ON DELETE CASCADE`
  }
  function parseDropConstraint(ast: DropConstraint) {
    return `ALTER TABLE "${ast.table}" DROP CONSTRAINT "${ast.table}_${ast.column}_fkey"`
  }
  function parseInsert(ast: Insert) {
    const values = Object.values(ast.values)
      .map(value => typeof value === 'string' ? `'${value}'` : value)

    return `INSERT INTO "${ast.table}" (${Object.keys(ast.values).join(', ')}) VALUES (${values.join(', ')})`
  }

  return {
    startTrx,
    commit,
    rollback,
    queryRow,
    query,

    prepareDatabase,

    parseCreateTable,
    parseAlterTable,
    parseDropTable,
    parseForeignKey,
    parseDropConstraint,
    parseInsert,

    ping,
    end,

    migrator({
      idColumn,
      nameColumn,
      runOnColumn,
      migrationsTable,
    }): Migrator {
      const tables = () => query(
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${migrationsTable}'`,
      )
      const selectAll = () => query(
        `SELECT ${nameColumn} FROM ${migrationsTable} ORDER BY ${runOnColumn}, ${idColumn}`,
      )
      async function createTable() {
        await query(
          `CREATE TABLE ${migrationsTable} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamptz NOT NULL)`,
        )
      }

      return {
        async delete(name, tx) {
          await query(`DELETE FROM "${migrationsTable}" WHERE ${nameColumn} = '${name}'`, null, tx)
        },
        async insert(name, tx) {
          await query(`INSERT INTO "${migrationsTable}" (${nameColumn}, ${runOnColumn}) VALUES ('${name}', NOW())`, null, tx)
        },
        tables,
        selectAll,
        createTable,
      }
    }
  }
}
