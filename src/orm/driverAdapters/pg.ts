import type { PoolClient } from 'pg'
import type {
  Postgresql,
  PostgresqlConnectionStringConfig,
  RemoveIdnetifiers,
} from '../../connection'
import type { Tx, QueryConfig } from '../types'
import type { Driver } from './types'
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

    return {
      getConnect,
      startTrx,
      commit,
      rollback,
      queryRow,
      query,
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
            `CREATE TABLE ${migrationsTable} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamp NOT NULL)`,
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
