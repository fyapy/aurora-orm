import type { DefaultColumn, column } from '../queryBuilder'
import type { DBConnection } from '../db'

interface MigrationOptions {
  column: typeof column
  defs: Record<'uuidGenerateV4' | 'now', DefaultColumn>
  sql: DBConnection
  getSQLConnection(connectionName: string): DBConnection
}

export const createMigration = (migration: {
  connectionNames?: string[]
  up(options: MigrationOptions): Promise<void> | void
  down(options: MigrationOptions): Promise<void> | void
}) => ({
  version: 'v1',
  ...migration,
})
