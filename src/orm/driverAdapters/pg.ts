import type { PoolClient } from 'pg'
import type {
  Postgresql,
  PostgresqlConnectionStringConfig,
  RemoveIdnetifiers,
} from '../../connection'
import type { Tx, QueryConfig } from '../types'
import type { Driver } from './types'
import {
  type DefaultColumn,
  type CreateTable,
  type AlterTable,
  type DropTable,
  ColumnOperator,
} from '../../migrator/queryBuilder'
import { SQLParams } from '../queryBuilder'

export async function postgreSQL({ config, ormLog }: {
  config: RemoveIdnetifiers<PostgresqlConnectionStringConfig | Postgresql>
  ormLog(sql: string, values?: any[] | null): void
}): Promise<Driver> {
    const { Pool } = await import('pg')

    const pool = new Pool(config)

    await pool.connect()

    async function queryRow<T = any>(sql: string, values: any[] | null, tx?: PoolClient, prepare: boolean = false): Promise<T> {
      ormLog(sql, values)
      const client = tx ?? await pool.connect()

      try {
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
      } catch (e) {
        throw e
      } finally {
        if (!tx) client.release()
      }
    }
    async function query<T = any>(sql: string, values?: any[] | null, tx?: PoolClient, prepare: boolean = false) {
      ormLog(sql, values)
      const client = tx ?? await pool.connect()

      try {
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
      } catch (e) {
        throw e
      } finally {
        if (!tx) client.release()
      }
    }
    async function getConnect(tx?: Tx): Promise<Tx> {
      if (typeof tx !== 'undefined') {
        return tx
      }
      return pool.connect()
    }
    async function startTrx(tx?: Tx) {
      const _tx = tx ?? await getConnect()
      await _tx.query('BEGIN')
      return _tx
    }
    async function commit(tx: Tx, closeConnection = true) {
      await tx.query('COMMIT')
      if (closeConnection === true) {
        tx.release()
      }
    }
    async function rollback(tx: Tx, closeConnection = true) {
      await tx.query('ROLLBACK')
      if (closeConnection === true) {
        tx.release()
      }
    }
    async function _end() {
      await pool.end()
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

      const columns = Object.entries(ast.columns)
      for (const [name, opts] of columns) {
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

        sql += column
      }

      sql += ');'

      return sql
    }
    function parseDropTable(ast: DropTable) {
      return `DROP TABLE "${ast.table}";`
    }

    function parseAlterTable(ast: AlterTable) {
      let sql = `ALTER TABLE "${ast.table}"`

      sql += Object.entries(ast.columns)
        .map(([name, opts]) => {
          if (opts.operator === ColumnOperator.AddColumn) {
            let sql = `ADD COLUMN "${name}" ${ast.type}`

            if (opts.notNull === true) {
              sql += ' NOT NULL'
            }
            if (typeof opts.default !== 'undefined') {
              sql += columnDefault(opts.default)
            }

            return sql
          }
          if (opts.operator === ColumnOperator.DropColumn) {
            return `DROP COLUMN "${name}"`
          }
          if (opts.operator === ColumnOperator.SetDefault) {
            return `ALTER COLUMN "${name}" SET${columnDefault(opts.value)}`
          }
          if (opts.operator === ColumnOperator.SetType) {
            return `ALTER COLUMN "${name}" TYPE ${opts.type}`
          }

          throw new Error('AlterTable ast parse error')
        })
        .join(', ')

      sql += ';'
      return sql
    }

    return {
      getConnect,
      startTrx,
      commit,
      rollback,
      queryRow,
      query,
      parseCreateTable,
      parseAlterTable,
      parseDropTable,
      _end,
      _: pool,

      migrator({
        schema,
        idColumn,
        nameColumn,
        runOnColumn,
        migrationsTable,
      }) {
        const tables = () => query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${migrationsTable}'`,
        )
        const selectAll = () => query(
          `SELECT ${nameColumn} FROM ${migrationsTable} ORDER BY ${runOnColumn}, ${idColumn}`,
        )
        const createTable = async () => {
          await query(
            `CREATE TABLE ${migrationsTable} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamptz NOT NULL)`,
          )
        }

        return {
          tables,
          selectAll,
          createTable,
        }
      }
    }
}
