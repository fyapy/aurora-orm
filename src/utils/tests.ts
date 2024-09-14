import type {Tx} from '../orm/types.js'

import {AbstractPoolRuntime, AbstractClient} from '../orm/driverAdapters/pg/types.js'
import {basePG} from '../orm/driverAdapters/pg/base.js'
import {pg} from '../orm/driverAdapters/pg/index.js'

const noop = () => {}
const asyncNoop = async () => {}

let sqlRows = [] as [string, any[] | null][]

export const getSqlRow = (index: number = 0) => {
  const data = sqlRows[index] ?? ['', null]

  return {sql: data[0], values: data[1]}
}

export function clearSqlRows() {
  sqlRows = []
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function mockQuery(sql: string, values: any[] | null, tx?: Tx) {
  sqlRows.push([sql, values])
  return {rows: []}
}

class Client implements AbstractClient {
  query = mockQuery
  end = asyncNoop
  release = noop
}

class Pool implements AbstractPoolRuntime {
  async connect() {
    return new Client()
  }

  query = mockQuery
  end = asyncNoop
  release = noop
}

export const mockBase = () => basePG({} as any, noop, async () => new Pool())
export const fakeDriver = () => pg({
  config: {} as any,
  ormLog: noop,
  mockBase,
})
