export enum Drivers {
  PG = 'pg'
}

export interface PostgresqlConnectionStringConfig {
  driver?: Drivers.PG
  connectionString: string
  debug?: boolean
}
export interface Postgresql {
  driver?: Drivers.PG
  host: string
  port: number
  username: string
  password: string
  database: string
  debug?: boolean
}

export type ConnectionConfig =
  | Postgresql
  | PostgresqlConnectionStringConfig

export type RemoveIdnetifiers<T extends Record<string, any>> = Omit<T, 'driver' | 'debug'>
