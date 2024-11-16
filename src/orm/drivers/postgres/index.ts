import {randomUUID} from 'node:crypto'
import postgres, {Sql} from 'postgres'

import type {ConnectionConfig} from '../../../config.js'
import type {Driver, OrmLog} from '../types.js'
import type {Tx} from '../../types.js'

import {migratorAstParsers, formatParams} from '../../../utils/sql.js'
import {whereOperators} from '../sqlOperators.js'
import {createMigrator} from '../sqlMigrator.js'
import {buildModel} from '../sqlBuildModel.js'

export async function createDriver({config, ormLog}: {
  config: ConnectionConfig
  ormLog: OrmLog
}): Promise<Driver> {
  const connectionString = 'connectionString' in config
    ? config.connectionString
    : `postgresql://${config.username}${config.password && `:${config.password}`}@${config.host}:${config.port}/${config.database}`

  const pool = postgres(connectionString, config)

  const transactions: Record<string, Sql> = {}

  async function prepareDatabase() {
    await pool.unsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  }

  async function ping() {
    await pool.unsafe('SELECT 1')
  }
  async function end() {
    await pool.end()
  }

  function query<T = any>(sql: string, values?: any[] | null, tx?: Tx) {
    ormLog(sql, values)
    const client = typeof tx === 'string' ? transactions[tx] : pool

    if (Array.isArray(values)) {
      return client.unsafe(formatParams(sql), values) as Promise<T[]>
    }

    return client.unsafe(sql) as Promise<T[]>
  }

  async function startTrx(tx?: Tx) {
    if (typeof tx === 'string') {
      return tx
    }

    const id = randomUUID()
    console.log('startTrx not implemented for Postgres.js driver, please use begin API')
    return id
  }
  async function commit() {
    console.log('commit not implemented for Postgres.js driver, please use begin API')
  }
  async function rollback(tx: Tx) {
    console.log('rollback not implemented for Postgres.js driver, please use begin API')
    delete transactions[tx]
  }

  return {
    prepareDatabase,
    ping,
    end,
    query,
    startTrx,
    commit,
    rollback,
    begin(transaction) {
      const id = randomUUID()

      try {
        return pool.begin(sql => {
          transactions[id] = sql
          return transaction(id)
        }) as Promise<any>
      } catch (e) {
        throw e
      } finally {
        delete transactions[id]
      }
    },

    ...migratorAstParsers(),
    migrator: createMigrator(query),

    whereOperators,
    buildModelMethods: buildModel(query),
  }
}
