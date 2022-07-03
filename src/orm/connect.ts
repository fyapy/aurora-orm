import { Pool } from 'pg'

export interface Config {
  pool: Pool | null
  debug: boolean
}
export const config: Config = {
  pool: null,
  debug: false,
}

interface ConnectConfig {
  type: 'postgresql'
  url: string
  debug?: boolean
}

export const connect = async ({ url, debug }: ConnectConfig) => {
  if (debug) {
    config.debug = debug
  }
  const pool = new Pool({
    connectionString: url,
  })

  await pool.connect()

  config.pool = pool
  return pool
}
