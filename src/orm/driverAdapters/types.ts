import type { AlterTable, CreateTable, DropTable } from '../../migrator/queryBuilder'
import type { Tx } from '../types'

export type Migrator = {
  delete(name: string): Promise<void>
  insert(name: string): Promise<void>
  tables(): Promise<any[]>
  selectAll(): Promise<any[]>
  createTable(): Promise<void>
}

export interface Driver {
  startTrx(tx?: Tx): Promise<Tx>
  commit(tx: Tx): Promise<void>
  rollback(tx: Tx): Promise<void>
  queryRow<T = any>(sql: string, values: any[] | null, tx?: Tx): Promise<T>
  query<T = any>(sql: string, values: any[] | null, tx?: Tx): Promise<T[]>

  prepareDatabase?(): Promise<void>

  parseCreateTable(ast: CreateTable): string
  parseAlterTable(ast: AlterTable): string
  parseDropTable(ast: DropTable): string

  ping(): Promise<void>
  end(): Promise<void>

  migrator: (options: {
    migrationsTable: string
    idColumn: string
    runOnColumn: string
    nameColumn: string
  }) => Migrator
}
