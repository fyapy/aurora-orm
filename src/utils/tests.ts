import {pg} from '../orm/drivers/pg/index.js'

let sqlRows = [] as [string, undefined | any[]][]

export const getSqlRow = (index: number = 0) => {
  const data = sqlRows[index] ?? ['', null]

  return {sql: data[0], values: data[1]}
}

export function clearSqlRows() {
  sqlRows = []
}

type Query = (sql: string, values?: any[]) => Promise<{rows: any[]}>

export interface AbstractClient {
  query: Query
  release(): void
}

export interface AbstractPool {
  connect(): Promise<AbstractClient>
  query: Query
  end(): Promise<void>
}

export function createFakePool(): AbstractPool {
  const query: Query = async (sql, values) => {
    sqlRows.push([sql, values])
    return {rows: []}
  }

  return {
    query,
    connect: async () => ({
      query,
      release: () => {},
    }),
    end: async () => {},
  }
}

export const fakeDriver = () => pg({
  config: {} as any,
  ormLog: () => {},
  createFakePool,
})
