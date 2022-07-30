import type { DBConnection } from '../db'

interface MigrationOptions {
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
