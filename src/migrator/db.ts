import { inspect } from 'node:util'
import { Client, ClientBase, ClientConfig, QueryArrayConfig, QueryArrayResult, QueryConfig, QueryResult } from 'pg'
import { DB } from './types'

export interface DBConnection extends DB {
  createConnection(): Promise<void>

  column(columnName: string, queryConfig: QueryArrayConfig, values?: any[]): Promise<any[]>
  column(columnName: string, queryConfig: QueryConfig): Promise<any[]>
  column(columnName: string, queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<any[]>

  connected: () => boolean
  // addBeforeCloseListener: (listener: any) => number
  close(): Promise<void>
}

enum ConnectionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export function connectDB(connection: ClientBase | string | ClientConfig): DBConnection {
  const isExternalClient =
    typeof connection === 'object' && 'query' in connection && typeof connection.query === 'function'
  let connectionStatus = ConnectionStatus.DISCONNECTED

  const client: Client = isExternalClient
    ? (connection as Client)
    : new Client(connection as string | ClientConfig)

  const createConnection = () => new Promise<void>((resolve, reject) => {
    if (isExternalClient || connectionStatus === ConnectionStatus.CONNECTED) {
      resolve()
    } else if (connectionStatus === ConnectionStatus.ERROR) {
      reject(new Error('Connection already failed, do not try to connect again'))
    } else {
      client.connect((err) => {
        if (err) {
          connectionStatus = ConnectionStatus.ERROR
          console.error(`could not connect to postgres: ${inspect(err)}`)
          return reject(err)
        }
        connectionStatus = ConnectionStatus.CONNECTED
        return resolve()
      })
    }
  })

  const query: DBConnection['query'] = async (
    queryTextOrConfig: string | QueryConfig | QueryArrayConfig,
    values?: any[],
  ): Promise<QueryArrayResult | QueryResult> => {
    await createConnection()
    try {
      return await client.query(queryTextOrConfig, values)
    } catch (err: any) {
      const { message, position }: { message: string; position: number } = err
      const string: string = typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text
      if (message && position >= 1) {
        const endLineWrapIndexOf = string.indexOf('\n', position)
        const endLineWrapPos = endLineWrapIndexOf >= 0 ? endLineWrapIndexOf : string.length
        const stringStart = string.substring(0, endLineWrapPos)
        const stringEnd = string.substr(endLineWrapPos)
        const startLineWrapPos = stringStart.lastIndexOf('\n') + 1
        const padding = ' '.repeat(position - startLineWrapPos - 1)
        console.error(`Error executing:
${stringStart}
${padding}^^^^${stringEnd}
${message}
`)
      } else {
        console.error(`Error executing:
${string}
${err}
`)
      }
      throw err
    }
  }

  const select: DBConnection['select'] = async (
    queryTextOrConfig: string | QueryConfig | QueryArrayConfig,
    values?: any[],
  ) => {
    const { rows } = await query(queryTextOrConfig, values)
    return rows
  }
  const column: DBConnection['column'] = async (
    columnName: string,
    queryTextOrConfig: string | QueryConfig | QueryArrayConfig,
    values?: any[],
  ) => {
    const rows = await select(queryTextOrConfig, values)
    return rows.map((r: { [key: string]: any }) => r[columnName])
  }

  return {
    createConnection,
    query,
    select,
    column,

    connected: () => connectionStatus === ConnectionStatus.CONNECTED,
    close: async () => {
      if (!isExternalClient) {
        connectionStatus = ConnectionStatus.DISCONNECTED
        client.end()
      }
    },
  }
}
