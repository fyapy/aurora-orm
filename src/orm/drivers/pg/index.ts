import {randomUUID} from 'node:crypto'
import pglib from 'pg'

import type {ConnectionConfig} from '../../../config.js'
import type {Driver} from '../types.js'
import type {OrmLog} from '../types.js'
import type {Tx} from '../../types.js'

import {migratorAstParsers, formatParams} from '../../../utils/sql.js'
import {AbstractClient, AbstractPool} from '../../../utils/tests.js'
import {whereOperators} from '../sqlOperators.js'
import {createMigrator} from '../sqlMigrator.js'
import {buildModel} from '../sqlBuildModel.js'

export async function createDriver({config, ormLog, createFakePool}: {
  config: ConnectionConfig
  ormLog: OrmLog
  createFakePool?(): AbstractPool
}): Promise<Driver> {
  const pool = typeof createFakePool === 'undefined' ? new pglib.Pool(config) : createFakePool()

  const transactions: Record<string, AbstractClient> = {}

  async function prepareDatabase() {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
  }

  async function ping() {
    await pool.query('SELECT 1')
  }
  async function end() {
    await pool.end()
  }

  async function query<T = any>(sql: string, values?: any[] | null, tx?: Tx) {
    ormLog(sql, values)
    const client = typeof tx === 'string' ? transactions[tx] : pool

    if (Array.isArray(values)) {
      return (await client.query(formatParams(sql), values)).rows as T[]
    }

    return (await client.query(sql)).rows as T[]
  }

  async function startTrx(tx?: Tx) {
    if (typeof tx === 'string') {
      return tx
    }

    const id = randomUUID()
    console.log('startTrx deprecated for pg driver, please use begin API')
    const client = await pool.connect()
    await client.query('BEGIN')
    transactions[id] = client

    return id
  }
  async function commit(tx: Tx) {
    console.log('commit deprecated for pg driver, please use begin API')
    const client = transactions[tx]
    await client.query('COMMIT')
    client.release()
  }
  async function rollback(tx: Tx) {
    console.log('rollback deprecated for pg driver, please use begin API')
    const client = transactions[tx]
    await client.query('ROLLBACK')
    client.release()
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
    async begin(transaction) {
      const id = randomUUID()
      const client = await pool.connect()
      await client.query('BEGIN')
      transactions[id] = client

      try {
        const result = await transaction(id)
        await client.query('COMMIT')
        return result
      } catch (e) {
        await client.query('ROLLBACK')
        throw e
      } finally {
        client.release()
        delete transactions[id]
      }
    },

    ...migratorAstParsers(),
    migrator: createMigrator(query),

    whereOperators,
    buildModelMethods: buildModel(query),
  }
}
