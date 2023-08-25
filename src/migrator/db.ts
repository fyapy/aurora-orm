import type { ConnectionConfig } from '../connection'
import type { Driver } from '../orm/driverAdapters'
import { inspect } from 'node:util'
import { connectToDatabase } from '../orm/connect'
import * as queryBuilder from './queryBuilder'

export interface DBConnection {
  driver: Driver
  createConnection(): Promise<void>
  query(sql: string, values?: any[]): Promise<any[]>

  createTable(table: string, columns: Record<string, queryBuilder.Column>): Promise<void>
  dropTable(table: string): Promise<void>
  alterTable(table: string, columns: Record<string, queryBuilder.AlterColumn>): Promise<void>

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

  async function createConnection(): Promise<void> {
    if (connectionStatus === ConnectionStatus.CONNECTED) return
    if (connectionStatus === ConnectionStatus.ERROR) {
      throw new Error('Connection already failed, do not try to connect again')
    }

    try {
      await driver.getConnect()
      connectionStatus = ConnectionStatus.CONNECTED
    } catch (err) {
      connectionStatus = ConnectionStatus.ERROR
      console.error(`Could not connect to database: ${inspect(err)}`)
      throw err
    }
  }

  async function query(sql: string, values?: any[]): Promise<any[]> {
    await createConnection()
    return await driver.query(sql, values ?? null)
  }

  async function createTable(table: string, columns: Record<string, queryBuilder.Column>) {
    const ast = queryBuilder.createTable(table, columns)
    const sql = driver.parseCreateTable(ast)

    await createConnection()
    await driver.query(sql, null)
  }

  async function dropTable(table: string) {
    const ast = queryBuilder.dropTable(table)
    const sql = driver.parseDropTable(ast)

    await createConnection()
    await driver.query(sql, null)
  }

  async function alterTable(table: string, columns: Record<string, queryBuilder.AlterColumn>) {
    const ast = queryBuilder.alterTable(table, columns)
    const sql = driver.parseAlterTable(ast)

    await createConnection()
    await driver.query(sql, null)
  }

  return {
    driver,
    createConnection,
    query,

    createTable,
    dropTable,
    alterTable,

    connected: () => connectionStatus === ConnectionStatus.CONNECTED,
    close() {
      connectionStatus = ConnectionStatus.DISCONNECTED
      return driver._end()
    },
  }
}
