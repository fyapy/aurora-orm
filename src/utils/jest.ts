import type { Tx } from '../orm/types'

let sqlRows = [] as [string, any[] | null][]

export const getSqlRow = (index: number = 0) => sqlRows[index] ?? ['', null]

export const clearSqlRows = () => sqlRows = []

export async function mockQueryRow(sql: string, values: any[] | null, tx?: Tx) {
  sqlRows.push([sql, values])
  return {} as any
}
