import type { Driver } from './driverAdapters'

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
  fn: (options: {
    values: WhereValues
    alias: string
  }) => string
}
export interface SetOperator {
  type: 'set-operator'
  name: string
  value: number
  fn: (alias: string) => string
}
export type Where<T extends AnyObject> = {
  [K in keyof T]?: Operator | T[K]
}
export type Set<T extends AnyObject> = {
  [K in keyof T]?: SetOperator | T[K]
}
export type WhereValues = Array<string | number | Array<string | number | null>>

interface Reader<T extends AnyObject> {
  findAll(value?: Where<T> | Where<T>[] | FindAllOptions<T>): Promise<T[]>
  findOne(id: ID | Where<T> | Where<T>[] | FindOneOptions<T>): Promise<T>
  exists(id: ID | Where<T> | Where<T>[], tx?: Tx): Promise<boolean>
  count(value: Where<T> | Where<T>[], tx?: Tx): Promise<number>
}

export interface BaseModel<T extends AnyObject = {}> extends Writer<T>, Reader<T> {
  primaryKey: string

  startTrx: Driver['startTrx']
  commit: Driver['commit']
  rollback: Driver['rollback']
}
