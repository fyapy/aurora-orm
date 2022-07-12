import { Pool } from 'pg'
import { loadConnectionConfig } from '../connection'
import { loadEnv } from '../utils/env'

export interface Config {
  pool: Pool | null
  debug: boolean
}
export const config: Config = {
  pool: null,
  debug: false,
}

interface ConnectConfig {
  debug?: boolean
  envPath?: string
  connectNotify?: boolean
}

export async function connect({ debug, envPath, connectNotify = true }: ConnectConfig = {}) {
  if (debug) {
    config.debug = debug
  }

  loadEnv(envPath)

  const pool = new Pool(loadConnectionConfig())

  await pool.connect()

  if (connectNotify) {
    console.log('Aurora ORM succesfully connected');
  }

  config.pool = pool
  return pool
}
