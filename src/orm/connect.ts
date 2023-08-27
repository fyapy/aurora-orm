import type { Driver } from './driverAdapters'
import { ConnectionConfig, loadConnectionConfig } from '../connection'
import { loadEnv } from '../utils/env'
import * as drivers from './driverAdapters'

export interface Config {
  driver: Driver | null
  debug: boolean
}

export const ormConfig: Config = {
  driver: null,
  debug: false,
}

type Subscribtion = (driver: Driver) => boolean
let subscribers: Subscribtion[] = []

function setConnection(driver: Driver) {
  if (ormConfig.driver !== null) {
    throw new Error('aurora-orm already connected!\nPlease ensure that connect called only once')
  }

  ormConfig.driver = driver
  subscribers = subscribers.filter(cb => cb(driver) === false)
}

export const subsctibeToConnection = (subscription: Subscribtion) => {
  subscribers.push(subscription)
}

function ormLog(sql: string, values?: any[] | null) {
  if (ormConfig.debug === true) {
    console.log(sql, values)
  }
}

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
  const driver = await connectToDatabase(auroraConfig)

  setConnection(driver)

  if (connectNotify) {
    console.log('Aurora ORM succesfully connected');
  }

  return ormConfig
}
