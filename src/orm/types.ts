import type {Driver} from './drivers/index.js'

export interface QueryConfig {
  name?: string
  text: string
  values?: any[]
}
export type Tx = string

export type AnyObject = Record<string, any>
export type ColumnData = {
  name: string
  hidden?: boolean
} | string

export type ID = string | number

interface Writer<T extends AnyObject> {
  create(value: Partial<T>, tx?: Tx): Promise<T>
  createMany(values: Partial<T>[], tx?: Tx): Promise<T[]>
  update(options: {
    where: Where<T> | ID
    set: Set<T>
    returning?: Array<keyof T> | boolean
    tx?: Tx
    prepared?: boolean
  }): Promise<T>
  delete(id: Where<T> | ID, tx?: Tx): Promise<boolean>
}

type SubJoin = [string, Array<[string] | SubJoin | string>]
export type Join = Array<SubJoin | string>

export interface BaseFindOptions<T> {
  join?: Join
  select?: Array<keyof T>
  orderBy?: {
    [K in keyof T]?: 'DESC' | 'ASC'
  }
  limit?: number
  skip?: number
  tx?: Tx
  prepared?: boolean
}

export interface FindAllOptions<T extends AnyObject> extends BaseFindOptions<T> {
  where: Where<T>[] | Where<T>
}
export interface FindOneOptions<T extends AnyObject> extends BaseFindOptions<T> {
  where: Where<T>[] | Where<T> | ID
}

export interface Operator {
  type: 'operator'
  name: string
  value?: any
}
export interface SetOperator {
  type: 'set-operator'
  name: string
  value: any
}
export type Where<T extends AnyObject> = {
  [K in keyof T]?: Operator | T[K]
}
export type Set<T extends AnyObject> = {
  [K in keyof T]?: SetOperator | T[K]
}
export type WhereValues = Array<Array<string | number | null> | string | number>

export interface WhereOperatorOptions {
  values: WhereValues
  alias: string
}

export type WhereOperator = (value: string, opts: WhereOperatorOptions) => string

interface Reader<T extends AnyObject> {
  findAll(value?: FindAllOptions<T> | Where<T>[] | Where<T>): Promise<T[]>
  findOne(id: FindOneOptions<T> | Where<T>[] | Where<T> | ID): Promise<T>
  findOrFail(id: FindOneOptions<T> | Where<T>[] | Where<T> | ID): Promise<T>
  exists(id: Where<T>[] | Where<T> | ID, tx?: Tx): Promise<boolean>
  existsOrFail(id: Where<T>[] | Where<T> | ID, tx?: Tx): Promise<boolean>
  count(value: Where<T>[] | Where<T>, tx?: Tx): Promise<number>
}

export interface Model<T extends AnyObject = AnyObject> extends Writer<T>, Reader<T> {
  primaryKey: string

  setDriver(newDriver: Driver): void
  getDriver(): Driver
  startTrx: Driver['startTrx']
  commit: Driver['commit']
  rollback: Driver['rollback']
}

export type Models = Record<string, Model>
export type JoinStrategy<T = Record<string, any>> = {
  table: string
  foreignProp: string
  referenceProp: string
  fn(options: {
    models: Models
    data: T[] | T
    prop: string
    primaryKey: string
    select?: never[]
    join?: Join
    tx?: Tx
  }): Promise<void>
}

export interface ModelOptions<T extends AnyObject> {
  table: string
  primaryKey?: string
  mapping: Record<keyof T, JoinStrategy | ColumnData>
  beforeCreate?: (setData?: Partial<T>) => Promise<void>
  afterCreate?: (data: T) => Promise<void>
  beforeUpdate?: (set: Set<T>) => Promise<void>
  afterUpdate?: (data: T) => Promise<void>
  beforeDelete?: (data: Where<T> | ID) => Promise<void>
  afterDelete?: (data: Where<T> | ID, deleted: boolean) => Promise<void>
  mockDriver?: Driver
}
