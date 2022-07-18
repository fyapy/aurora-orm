export type ConnectionConfig =
  {
    name?: string
    type?: 'postgresql'
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  | {
    name?: string
    type?: 'postgresql'
    connectionString: string
  }
  | {
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
