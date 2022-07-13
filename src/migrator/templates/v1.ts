import type { connectDB } from '../db'

interface MigrationOptions {
  db: ReturnType<typeof connectDB>
}

export const createMigration = (migration: {
  up: (options: MigrationOptions) => Promise<void> | void
  down: (options: MigrationOptions) => Promise<void> | void
}) => ({
  version: 'v1',
  ...migration,
})
