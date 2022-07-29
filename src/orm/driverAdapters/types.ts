import type { Tx } from '../types'

export interface Driver {
  getConnect: () => Promise<Tx>
  startTrx(tx?: Tx): Promise<Tx>
  commit(tx: Tx, closeConnection?: boolean): Promise<void>
  rollback(tx: Tx, closeConnection?: boolean): Promise<void>
  queryRow: <T = any>(sql: string, values: any[] | null, tx?: any | undefined) => Promise<T>
  query: <T = any>(sql: string, values: any[] | null, tx?: any | undefined) => Promise<T[]>
  _: import('pg').Pool | import('cassandra-driver').Client
}
