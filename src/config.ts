export enum Drivers {
  PG = 'pg'
}

export interface PostgresqlConnectionStringConfig {
  connectionString: string
  driver?: Drivers
  debug?: boolean
}
export interface PostgresqlConfig {
  host: string
  port: number
  username: string
  password: string
  database: string
  driver?: Drivers
  debug?: boolean
}

export type ConnectionConfig =
  | PostgresqlConfig
  | PostgresqlConnectionStringConfig
