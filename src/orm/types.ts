import type { Driver } from './driverAdapters/index.js'

export interface QueryConfig {
  name?: string
  text: string
  values?: any[]
}
export type Tx = string

export type AnyObject = Record<string, any>
export type ColumnData = string | {
  name: string
  hidden?: boolean
}

export type ID = string | number

interface Writer<T extends AnyObject> {
  create(value: Partial<T>, tx?: Tx): Promise<T>
  createMany(values: Partial<T>[], tx?: Tx): Promise<T[]>
  update(options: {
    where: ID | Where<T>
    set: Set<T>
    returning?: boolean | Array<keyof T>
    tx?: Tx
    prepared?: boolean
  }): Promise<T>
  delete(id: ID | Where<T>, tx?: Tx): Promise<boolean>
}

type SubJoin = [string, Array<string | [string] | SubJoin>]
export type Join = Array<string | SubJoin>

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
  where: Where<T> | Where<T>[]
}
export interface FindOneOptions<T extends AnyObject> extends BaseFindOptions<T> {
  where: ID | Where<T> | Where<T>[]
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
export type WhereValues = Array<string | number | Array<string | number | null>>

export interface WhereOperatorOptions {
  values: WhereValues
  alias: string
}

export type WhereOperator = (value: string, opts: WhereOperatorOptions) => string

interface Reader<T extends AnyObject> {
  findAll(value?: Where<T> | Where<T>[] | FindAllOptions<T>): Promise<T[]>
  findOne(id: ID | Where<T> | Where<T>[] | FindOneOptions<T>): Promise<T>
  findOrFail(id: ID | Where<T> | Where<T>[] | FindOneOptions<T>): Promise<T>
  exists(id: ID | Where<T> | Where<T>[], tx?: Tx): Promise<boolean>
  existsOrFail(id: ID | Where<T> | Where<T>[], tx?: Tx): Promise<boolean>
  count(value: Where<T> | Where<T>[], tx?: Tx): Promise<number>
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
    data: T | T[]
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
  mapping: Record<keyof T, ColumnData | JoinStrategy>
  beforeCreate?: (setData?: Partial<T>) => Promise<void>
  afterCreate?: (data: T) => Promise<void>
  beforeUpdate?: (set: Set<T>) => Promise<void>
  afterUpdate?: (data: T) => Promise<void>
  beforeDelete?: (data: ID | Where<T>) => Promise<void>
  afterDelete?: (data: ID | Where<T>, deleted: boolean) => Promise<void>
  mockDriver?: Driver
}
