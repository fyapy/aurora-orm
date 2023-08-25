import type { AlterTable, CreateTable, DropTable } from '../../migrator/queryBuilder'
import type { Tx } from '../types'

export interface Driver {
  getConnect(): Promise<Tx>
  startTrx(tx?: Tx): Promise<Tx>
  commit(tx: Tx, closeConnection?: boolean): Promise<void>
  rollback(tx: Tx, closeConnection?: boolean): Promise<void>
  queryRow<T = any>(sql: string, values: any[] | null, tx?: any | undefined): Promise<T>
  query<T = any>(sql: string, values: any[] | null, tx?: any | undefined): Promise<T[]>

  prepareDatabase?(): Promise<void>

  parseCreateTable(ast: CreateTable): string
  parseAlterTable(ast: AlterTable): string
  parseDropTable(ast: DropTable): string

  _end(): Promise<void>
  _: import('pg').Pool // | import('cassandra-driver').Client

  migrator(options: {
    schema: string
    migrationsTable: string
    idColumn: string
    runOnColumn: string
    nameColumn: string
  }): {
    tables(): Promise<any[]>,
    selectAll(): Promise<any[]>,
    createTable(): Promise<void>,
  }
}
