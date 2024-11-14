import type {DropConstraint, CreateTable, AlterTable, ForeignKey, DropTable, Insert} from '../../migrator/queryBuilder.js'
import type {WhereOperatorOptions, ModelOptions, AnyObject, Models, Model, Tx} from '../types.js'

export type Migrator = {
  delete(name: string, tx: Tx): Promise<void>
  insert(name: string, tx: Tx): Promise<void>
  tables(): Promise<any[]>
  selectAll<T = any>(): Promise<T[]>
  createTable(): Promise<void>
}

export interface BuildModelMethodsOptions<T extends AnyObject> extends ModelOptions<T> {
  primaryKey: string
  models: Models
}

export interface Driver {
  whereOperators: Record<string, (value: string, opts: WhereOperatorOptions) => string>

  begin<T = void>(transaction: (tx: Tx) => Promise<T>): Promise<T>
  startTrx(tx?: Tx): Promise<Tx>
  commit(tx: Tx): Promise<void>
  rollback(tx: Tx): Promise<void>
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

  buildModelMethods<T extends AnyObject>(options: BuildModelMethodsOptions<T>): {
    findAll: Model['findAll']
    findOne: Model['findOne']
    findOrFail: Model['findOrFail']
    exists: Model['exists']
    existsOrFail: Model['existsOrFail']
    count: Model['count']

    create: Model['create']
    createMany: Model['createMany']
    update: Model['update']
    delete: Model['delete']
  }
}
