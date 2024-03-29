import type { ConnectionConfig } from '../connection'
import type { Foreign, Value } from './queryBuilder'
import type { Driver } from '../orm/driverAdapters'
import type { Tx } from '../orm'
import { inspect } from 'node:util'
import { connectToDatabase } from '../orm/connect'
import * as queryBuilder from './queryBuilder'

export interface DBConnection {
  driver: Driver
  createConnection(): Promise<void>

  createTable(table: string, columns: Record<string, queryBuilder.Column>, tx?: Tx): Promise<void>
  dropTable(table: string, tx?: Tx): Promise<void>
  alterTable(table: string, columns: Record<string, queryBuilder.AlterColumn>, tx?: Tx): Promise<void>
  foreignKey(foreign: Foreign, reference: Foreign, tx?: Tx): Promise<void>
  dropConstraint(table: string, column: string, tx?: Tx): Promise<void>
  insert(table: string, values: Record<string, Value>, tx?: Tx): Promise<any>

  connected(): boolean
  close(): Promise<void>
}

enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export async function connectDB(config: ConnectionConfig): Promise<DBConnection> {
  let connectionStatus = ConnectionStatus.DISCONNECTED

  const driver = await connectToDatabase(config)

  async function createConnection() {
    if (connectionStatus === ConnectionStatus.CONNECTED) return
    if (connectionStatus === ConnectionStatus.ERROR) {
      throw new Error('Connection already failed, do not try to connect again')
    }

    try {
      await driver.ping()
      connectionStatus = ConnectionStatus.CONNECTED
    } catch (err) {
      connectionStatus = ConnectionStatus.ERROR
      console.error(`Could not connect to database: ${inspect(err)}`)
      throw err
    }
  }

  async function createTable(table: string, columns: Record<string, queryBuilder.Column>, tx?: Tx) {
    const ast = queryBuilder.createTable(table, columns)
    const sql = driver.parseCreateTable(ast)

    await createConnection()
    await driver.query(sql, null, tx)
  }

  async function dropTable(table: string, tx?: Tx) {
    const ast = queryBuilder.dropTable(table)
    const sql = driver.parseDropTable(ast)

    await createConnection()
    await driver.query(sql, null, tx)
  }

  async function alterTable(table: string, columns: Record<string, queryBuilder.AlterColumn>, tx?: Tx) {
    const ast = queryBuilder.alterTable(table, columns)
    const sql = driver.parseAlterTable(ast)

    await createConnection()
    await driver.query(sql, null, tx)
  }

  async function foreignKey(foreign: Foreign, reference: Foreign, tx?: Tx) {
    const ast = queryBuilder.foreignKey(foreign, reference)
    const sql = driver.parseForeignKey(ast)

    await createConnection()
    await driver.query(sql, null, tx)
  }

  async function dropConstraint(table: string, column: string, tx?: Tx) {
    const ast = queryBuilder.dropConstraint(table, column)
    const sql = driver.parseDropConstraint(ast)

    await createConnection()
    await driver.query(sql, null, tx)
  }

  async function insert(table: string, values: Record<string, Value>, tx?: Tx) {
    const ast = queryBuilder.insert(table, values)
    const sql = driver.parseInsert(ast)

    await createConnection()
    await driver.query(sql, null, tx)
  }

  return {
    driver,
    createConnection,

    createTable,
    dropTable,
    alterTable,
    foreignKey,
    dropConstraint,
    insert,

    connected: () => connectionStatus === ConnectionStatus.CONNECTED,
    close() {
      connectionStatus = ConnectionStatus.DISCONNECTED
      return driver.end()
    },
  }
}
