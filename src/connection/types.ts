// export interface CassandraConfig {
//   name?: string
//   type: 'cassandra'
//   keyspace: string
//   contactPoints: string[]
//   localDataCenter: string
//   auth?: {
//     username: string
//     password: string
//   }
// }
export interface PostgresqlConnectionStringConfig {
  type?: 'postgresql'
  connectionString: string
  debug?: boolean
}
export interface Postgresql {
  type?: 'postgresql'
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
  // | CassandraConfig

export type RemoveIdnetifiers<T extends Record<string, any>> = Omit<T, 'name' | 'type' | 'debug'>
