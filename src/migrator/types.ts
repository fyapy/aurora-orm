import type {DefaultColumn, column} from './queryBuilder.js'
import type {ConnectionConfig} from '../config.js'
import type {DBConnection} from './db.js'

export interface RunMigration {
  path: string
  name: string
  timestamp: number
}

export type MigrationDirection = 'down' | 'up'
export interface RunMigrationsOptions {
  direction: MigrationDirection
  config: ConnectionConfig
  directory?: string
  logger?(...args: any[]): void
}

export type MigrationAction = (options: {
  column: typeof column
  defs: Record<'emptyArray' | 'uuidV4' | 'now', DefaultColumn>
  sql: DBConnection
}) => Promise<void> | void

export interface MigrationBuilderActions {
  connectionNames?: string[]
  up?: MigrationAction
  down?: MigrationAction
}

export interface Migration {
  name: string
  path: string
  timestamp: number
  db: DBConnection
  getActions(): Promise<MigrationBuilderActions>
  apply(direction: MigrationDirection): Promise<void>
}

export type Logger = (...args: any[]) => void
