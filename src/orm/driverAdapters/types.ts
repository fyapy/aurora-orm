import type { AlterTable, CreateTable, DropTable } from '../../migrator/queryBuilder'
import type { BaseModel, Tx, ModelOptions, Repos, AnyObject } from '../types'

export type Migrator = {
  delete(name: string, tx: Tx): Promise<void>
  insert(name: string, tx: Tx): Promise<void>
  tables(): Promise<any[]>
  selectAll(): Promise<any[]>
  createTable(): Promise<void>
}

export interface buildModelMethodsOptions<T extends AnyObject> extends ModelOptions<T> {
  primaryKey: string
  repos: Repos
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

  buildModelMethods<T extends AnyObject>(options: buildModelMethodsOptions<T>): {
    findAll: BaseModel['findAll']
    findOne: BaseModel['findOne']
    exists: BaseModel['exists']
    count: BaseModel['count']

    create: BaseModel['create']
    createMany: BaseModel['createMany']
    update: BaseModel['update']
    delete: BaseModel['delete']
  }
}
