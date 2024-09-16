import type {DefaultColumn, column} from './queryBuilder.js'
import type {DBConnection} from './db.js'

interface MigrationOptions {
  column: typeof column
  defs: Record<'emptyArray' | 'uuidV4' | 'now', DefaultColumn>
  sql: DBConnection
  getSQLConnection(connectionName: string): DBConnection
}

export function createMigration(migration: {
  connectionNames?: string[]
  up(options: MigrationOptions): Promise<void> | void
  down(options: MigrationOptions): Promise<void> | void
}) {
  return migration
}
