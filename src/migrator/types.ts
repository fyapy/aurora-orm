import type { ConnectionConfig } from '../connection'
import type { DefaultColumn, column } from './queryBuilder'
import type { DBConnection } from './db'

export interface RunMigration {
  readonly path: string
  readonly name: string
  readonly timestamp: number
}

export type MigrationDirection = 'up' | 'down'
export interface RunnerOptionConfig {
  direction: MigrationDirection

  config: ConnectionConfig | ConnectionConfig[]
  migrationsConfig?: ConnectionConfig
}

export type MigrationAction = (options: {
  column: typeof column
  defs: Record<'uuidGenerateV4' | 'now', DefaultColumn>
  sql: DBConnection
  databases: Record<string, DBConnection>
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
