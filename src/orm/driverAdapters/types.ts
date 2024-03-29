import type { AlterTable, CreateTable, DropConstraint, DropTable, ForeignKey, Insert } from '../../migrator/queryBuilder'
import type { Model, Tx, ModelOptions, Models, AnyObject } from '../types'

export type Migrator = {
  delete(name: string, tx: Tx): Promise<void>
  insert(name: string, tx: Tx): Promise<void>
  tables(): Promise<any[]>
  selectAll(): Promise<any[]>
  createTable(): Promise<void>
}

export interface buildModelMethodsOptions<T extends AnyObject> extends ModelOptions<T> {
  primaryKey: string
  models: Models
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
  parseForeignKey(ast: ForeignKey): string
  parseDropConstraint(ast: DropConstraint): string
  parseInsert(ast: Insert): string

  ping(): Promise<void>
  end(): Promise<void>

  migrator: (options: {
    migrationsTable: string
    idColumn: string
    runOnColumn: string
    nameColumn: string
  }) => Migrator

  buildModelMethods<T extends AnyObject>(options: buildModelMethodsOptions<T>): {
    findAll: Model['findAll']
    findOne: Model['findOne']
    exists: Model['exists']
    count: Model['count']

    create: Model['create']
    createMany: Model['createMany']
    update: Model['update']
    delete: Model['delete']
  }
}
