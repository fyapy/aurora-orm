import type { QueryConfig, Tx } from './types'
import { ConnectionConfig, loadConnectionConfig } from '../connection'
import { loadEnv } from '../utils/env'
import { SQLParams } from './queryBuilder'
import { PoolClient } from 'pg'

export interface Connection {
  getConnect: () => Promise<Tx>
  startTrx(tx?: Tx): Promise<Tx>
  commit(tx: Tx, closeConnection?: boolean): Promise<void>
  rollback(tx: Tx, closeConnection?: boolean): Promise<void>
  queryRow: <T = any>(sql: string, values: any[] | null, tx?: any | undefined) => Promise<T>
  query: <T = any>(sql: string, values: any[] | null, tx?: any | undefined) => Promise<T[]>
  _: import('pg').Pool | import('cassandra-driver').Client
}

export interface Config {
  connections: Record<string, Connection>
  debug: boolean
}
export const ormConfig: Config = {
  connections: {},
  debug: false,
}

function ormLog(sql: string, values?: any[] | null) {
  if (ormConfig.debug === true) {
    console.log(sql, values)
  }
}

export const DefaultConnection = 'default' as const

interface ConnectConfig {
  debug?: boolean
  envPath?: string
  connectNotify?: boolean
}

async function connectToDatabase(config: ConnectionConfig): Promise<Connection> {
  function deleteType() {
    if (config.type) delete config.type
    if (config.name) delete config.name
  }

  switch (config.type) {
    case 'postgresql': {
      const { Pool } = await import('pg')

      deleteType()
      const pool = new Pool(config)

      await pool.connect()

      async function queryRow<T = any>(sql: string, values: any[] | null, tx?: PoolClient, prepare: boolean = false): Promise<T> {
        ormLog(sql, values)
        const client = tx ?? await pool.connect()

        try {
          if (Array.isArray(values)) {
            const res = await client.query(SQLParams(sql), values)

            return ((res as any).command === 'DELETE'
              ? (res as any).rowCount !== 0
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
          console.error(e)
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
          console.error(e)
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

      return {
        getConnect,
        startTrx,
        commit,
        rollback,
        queryRow,
        query,
        _: pool,
      }
    }
    case 'cassandra': {
      const { Client, auth } = await import('cassandra-driver')

      deleteType()
      const pool = new Client({
        keyspace: config.keyspace,
        contactPoints: config.contactPoints,
        localDataCenter: config.localDataCenter,
        ...(config.auth
          ? { auth: new auth.PlainTextAuthProvider(config.auth.username, config.auth.password) }
          : {}),
      })

      await pool.connect()

      function getConnect() {
        return <Tx>{
          release() {},
          async query(sql: string | QueryConfig, values?: any[]) {
            // TODO check if it is log
            console.log('TODO check if it is log')
            if (typeof sql === 'object') {
              return await pool.execute(sql.text, sql.values, { prepare: !!sql.name })
            }

            return await pool.execute(sql, values)
          }
        } as unknown as Promise<Tx>
      }

      async function queryRow<T = any>(sql: string, values: any[] | null, tx?: Tx, prepare: boolean = false): Promise<T> {
        ormLog(sql, values)
        try {
          if (Array.isArray(values)) {
            const res = await pool.execute(sql, values, { prepare })

            return res.rows[0] as unknown as T
          }

          const res = await pool.execute(sql, { prepare })

          return res.rows[0] as unknown as T
        } catch (e) {
          console.error(e)
          throw e
        }
      }
      async function query<T = any>(sql: string, values: any[] | null, tx?: Tx, prepare: boolean = false): Promise<T[]> {
        ormLog(sql, values)
        try {
          if (Array.isArray(values)) {
            const res = await pool.execute(sql, values, { prepare })

            return res.rows as unknown as T[]
          }

          const res = await pool.execute(sql, { prepare })

          return res.rows as unknown as T[]
        } catch (e) {
          console.error(e)
          throw e
        }
      }
      async function startTrx(tx?: Tx) {
        const _tx = tx ?? getConnect() // not promise
        console.log('Cassandra: BEGIN')
        return _tx
      }
      const commit = async (tx: Tx, closeConnection = true) => console.log('Cassandra: COMMIT')
      const rollback = async (tx: Tx, closeConnection = true) => console.log('Cassandra: ROLLBACK')

      return {
        getConnect,
        queryRow,
        query,
        startTrx,
        commit,
        rollback,
        _: pool,
      }
    }
    default:
      throw new Error(`Aurora-orm.json connection have unknown type '${config.type}'`)
  }
}

export async function connect({ debug, envPath, connectNotify = true }: ConnectConfig = {}) {
  if (debug) {
    ormConfig.debug = debug
  }

  loadEnv(envPath)

  const auroraConfig = loadConnectionConfig()

  if (Array.isArray(auroraConfig)) {
    for (const connectConfig of auroraConfig) {
      const ConnectionName = connectConfig.name!

      ormConfig.connections[ConnectionName] = await connectToDatabase(connectConfig)
    }
  } else {
    ormConfig.connections[DefaultConnection] = await connectToDatabase(auroraConfig)
  }

  if (connectNotify) {
    console.log('Aurora ORM succesfully connected');
  }

  return ormConfig
}
