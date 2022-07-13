import { ClientConfig, QueryArrayConfig, QueryArrayResult, QueryConfig, QueryResult } from 'pg'
import { connectDB } from './db'

export interface RunMigration {
  readonly path: string
  readonly name: string
  readonly timestamp: number
}

export type MigrationDirection = 'up' | 'down'
export interface RunnerOptionConfig {
  direction: MigrationDirection

  databaseUrl: ClientConfig
}

export interface DB {
  query(queryConfig: QueryArrayConfig, values?: any[]): Promise<QueryArrayResult>
  query(queryConfig: QueryConfig): Promise<QueryResult>
  query(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>

  select(queryConfig: QueryArrayConfig, values?: any[]): Promise<any[]>
  select(queryConfig: QueryConfig): Promise<any[]>
  select(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<any[]>
}

export type MigrationAction = (options: {
  db: ReturnType<typeof connectDB>
}) => Promise<void> | void

export interface MigrationBuilderActions {
  version: 'v1'
  up?: MigrationAction | false
  down?: MigrationAction | false
}

export interface Migration {
  name: string
  path: string
  timestamp: number
  db: ReturnType<typeof connectDB>
  up: MigrationBuilderActions['up']
  down: MigrationBuilderActions['down']
  apply: (direction: MigrationDirection) => Promise<void>
}
