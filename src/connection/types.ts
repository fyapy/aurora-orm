export type ConnectionConfig =
  {
    type?: 'postgresql'
    host: string
    port: number
    username: string
    password: string
    database: string
  }
  | {
    type?: 'postgresql'
    connectionString: string
  }
