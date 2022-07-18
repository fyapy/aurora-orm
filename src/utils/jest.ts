
let sqlRows = [] as [string, any[] | null][]

export const getSqlRow = (index: number = 0) => sqlRows[index] ?? ['', null]

export const clearSqlRows = () => sqlRows = []

export function mockQueryRow(name: string) {
  return async (sql: string, values: any[] | null, tx?: any) => {
    sqlRows.push([sql, values])
    return {} as any
  }
}
