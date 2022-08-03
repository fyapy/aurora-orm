import type { ConnectionConfig } from '../connection'
import type { Driver } from '../orm/driverAdapters'
import { inspect } from 'node:util'
import { connectToDatabase } from '../orm/connect'

export interface DBConnection {
  driver: Driver
  createConnection(): Promise<void>
  query(sql: string, values?: any[]): Promise<any[]>

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
    try {
      return await driver.query(sql, values ?? null)
    } catch (err: any) {
      console.error(`Error executing:\n${err}\n`)
      throw err
    }
  }

  return {
    driver,
    createConnection,
    query,

    connected: () => connectionStatus === ConnectionStatus.CONNECTED,
    close() {
      connectionStatus = ConnectionStatus.DISCONNECTED
      return driver._end()
    },
  }
}
