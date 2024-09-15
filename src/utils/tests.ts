import {AbstractPoolRuntime, AbstractClient} from '../orm/drivers/pg/types.js'
import {basePG} from '../orm/drivers/pg/base.js'
import {pg} from '../orm/drivers/pg/index.js'

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

async function mockQuery(sql: string, values: any[] | null) {
  sqlRows.push([sql, values])
  return {rows: []}
}

class MockClient implements AbstractClient {
  query = mockQuery
  end = asyncNoop
  release = noop
}

class MockPool implements AbstractPoolRuntime {
  async connect() {
    return new MockClient()
  }

  query = mockQuery
  end = asyncNoop
  release = noop
}

export const createBase = () => basePG({} as any, noop, MockPool as any)
export const fakeDriver = () => pg({
  config: {} as any,
  ormLog: noop,
  createBase,
})
