import type { CassandraConfig, RemoveIdnetifiers } from '../../connection'
import type { QueryConfig, Tx } from '../types'
import type { Driver } from './types'

export async function cassandra({ config, ormLog }: {
  config: RemoveIdnetifiers<CassandraConfig>
  ormLog: (sql: string, values?: any[] | null) => void
}): Promise<Driver> {
  const { Client, auth } = await import('cassandra-driver')

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
  const rollback = async (tx: Tx, closeConnection = true) => {
    console.log('Cassandra: ROLLBACK')
  }

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
