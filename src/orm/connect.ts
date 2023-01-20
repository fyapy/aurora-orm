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

type Subscribtion = (connectionName: string, driver: Driver) => boolean
let subscribers: Subscribtion[] = []

function setConnection(connectionName: string, driver: Driver) {
  ormConfig.connections[connectionName] = driver
  subscribers = subscribers.filter(cb => cb(connectionName, driver) === false)
}

export const subsctibeToConnection = (subscription: Subscribtion) => {
  subscribers.push(subscription)
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

enum DatabaseTypes {
  PostgreSQL = 'postgresql'
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
    case DatabaseTypes.PostgreSQL:
      deleteType()
      return drivers.postgreSQL({ config, ormLog })
    // case 'cassandra':
    //   deleteType()
    //   return drivers.cassandra({ config, ormLog })
    default:
      const endOfError = `, сhoose one of these types: ${Object.values(DatabaseTypes)}`
      throw new Error(config.type
        ? `aurora-orm.json connection have unknown type '${config.type}'${endOfError}`
        : `aurora-orm.json don't have "type" property${endOfError}`)
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

      setConnection(ConnectionName, await connectToDatabase(connectConfig))
    }
  } else {
    setConnection(DefaultConnection, await connectToDatabase(auroraConfig))
  }

  if (connectNotify) {
    console.log('Aurora ORM succesfully connected');
  }

  return ormConfig
}
