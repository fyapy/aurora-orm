import type { Driver } from './driverAdapters'
import { ConnectionConfig, loadConnectionConfig } from '../connection'
import { Drivers } from '../connection/types'
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
  config?: ConnectionConfig
  debug?: boolean
  connectNotify?: boolean
}

export function connectToDatabase(config: ConnectionConfig): Promise<Driver> {
  function deleteDriverType() {
    if (config.driver) delete config.driver

    if (typeof config.debug === 'boolean') {
      ormConfig.debug = config.debug
    }
  }

  switch (config.driver) {
    case Drivers.PG:
      deleteDriverType()
      return drivers.pg({ config, ormLog })
    default:
      const endOfError = `, сhoose one of these types: ${Object.values(Drivers)}`
      throw new Error(config.driver
        ? `aurora-orm.json connection have unknown driver '${config.driver}'${endOfError}`
        : `aurora-orm.json don't have "driver" property${endOfError}`)
  }
}

export async function connect({ debug, config, connectNotify = true }: ConnectConfig = {}) {
  if (typeof debug !== 'undefined') {
    ormConfig.debug = debug
  }

  const timeout = 5000
  const auroraConfig = typeof config !== 'undefined'
    ? config
    : loadConnectionConfig()

  setTimeout(() => {
    if (ormConfig.driver === null) {
      throw new Error(`aurora-orm cannot get connection during ${timeout} ms, check database connection!`)
    }
  }, timeout)

  const driver = await connectToDatabase(auroraConfig)

  setConnection(driver)

  if (connectNotify === true) {
    console.log('Aurora ORM succesfully connected')
  }

  return ormConfig
}
