export interface CassandraConfig {
  name?: string
  type: 'cassandra'
  keyspace: string
  contactPoints: string[]
  localDataCenter: string
  auth?: {
    username: string
    password: string
  }
}
export interface PostgresqlConnectionStringConfig {
  name?: string
  type?: 'postgresql'
  connectionString: string
}
export interface Postgresql {
  name?: string
  type?: 'postgresql'
  host: string
  port: number
  username: string
  password: string
  database: string
}

export type ConnectionConfig =
  | Postgresql
  | PostgresqlConnectionStringConfig
  | CassandraConfig

export type RemoveIdnetifiers<T extends Record<string, any>> = Omit<T, 'name' | 'type'>
