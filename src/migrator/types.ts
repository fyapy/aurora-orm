import type { ConnectionConfig } from '../types.js'
import type { DefaultColumn, column } from './queryBuilder.js'
import type { DBConnection } from './db.js'

export interface RunMigration {
  path: string
  name: string
  timestamp: number
}

export type MigrationDirection = 'up' | 'down'
export interface RunnerOptionConfig {
  direction: MigrationDirection

  config: ConnectionConfig
  migrationsConfig?: ConnectionConfig
}

export type MigrationAction = (options: {
  column: typeof column
  defs: Record<'uuidV4' | 'now' | 'emptyArray', DefaultColumn>
  sql: DBConnection
}) => Promise<void> | void

export interface MigrationBuilderActions {
  version: 'v1'
  connectionNames?: string[]
  up?: MigrationAction | false
  down?: MigrationAction | false
}

export interface Migration {
  name: string
  path: string
  timestamp: number
  db: DBConnection
  up: MigrationBuilderActions['up']
  down: MigrationBuilderActions['down']
  apply(direction: MigrationDirection): Promise<void>
}
