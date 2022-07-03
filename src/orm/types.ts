import type { PoolClient } from 'pg'

export type Tx = PoolClient

export type AnyObject = Record<string, any>
export type ColumnData = string | {
  name: string
  hidden?: boolean
}

export type ID = string | number

interface Writer<T, P, C> {
  create(value: Partial<P>, tx?: C): Promise<T>
  createMany(values: Partial<P>[], tx?: C): Promise<T[]>
  update(id: ID | Where<P>, newValue: Partial<P>, tx?: C): Promise<T>
  delete(id: ID | Where<P>, tx?: C): Promise<boolean>
}

type SubJoin = [string, Array<string | [string] | SubJoin>]
export type Join = Array<string | SubJoin>

export interface FindOptions<T, C> {
  join?: Join
  select?: Array<keyof T>
  orderBy?: {
    [K in keyof T]?: 'DESC' | 'ASC'
  }
  limit?: number
  skip?: number
  tx?: C
}

export interface SQL {
  type: 'sql'
  fn: (options: {
    values: WhereValues
    alias: string
  }) => string
}
export type Where<T extends AnyObject> = {
  [K in keyof T]?: SQL | T[K]
}
export type WhereValues = Array<string | number | Array<string | number | null>>

interface Reader<T, P, C> {
  findAll(value: Where<P> | Where<P>[], options?: FindOptions<P, C>): Promise<T[]>
  findOne(id: ID | Where<P> | Where<P>[], options?: FindOptions<P, C>): Promise<T>
  exists(id: ID | Where<P> | Where<P>[], tx?: Tx): Promise<boolean>
  count(value: Where<P> | Where<P>[], tx?: Tx): Promise<number>
}

export type BaseModel<T, P, C> = Writer<T, P, C> & Reader<T, P, C>
