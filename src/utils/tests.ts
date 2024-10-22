import * as pg from '../orm/drivers/pg/index.js'

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

type ResultRows = any[][]

export function createFakePool(results: ResultRows = []): AbstractPool {
  let index = 0

  const query: Query = async (sql, values) => {
    const rows = results[index] ?? []
    index++

    sqlRows.push([sql, values])
    return {rows}
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

export const fakeDriver = (results: ResultRows = []) => pg.createDriver({
  config: {} as any,
  ormLog: () => {},
  createFakePool: () => createFakePool(results),
})
