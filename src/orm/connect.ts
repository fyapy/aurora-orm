import type { Driver } from './driverAdapters'
import { ConnectionConfig, loadConnectionConfig } from '../connection'
import { loadEnv } from '../utils/env'
import * as drivers from './driverAdapters'

export interface Config {
  connections: Record<string, Driver>
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

export function connectToDatabase(config: ConnectionConfig): Promise<Driver> {
  function deleteType() {
    if (config.type) delete config.type
    if (config.name) delete config.name

    if (typeof config.debug === 'boolean') {
      ormConfig.debug = config.debug
    }
  }

  switch (config.type) {
    case 'postgresql':
      deleteType()
      return drivers.postgreSQL({ config, ormLog })
    // case 'cassandra':
    //   deleteType()
    //   return drivers.cassandra({ config, ormLog })
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
