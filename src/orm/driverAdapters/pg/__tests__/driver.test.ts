import type { AbstractClient, AbstractPoolRuntime } from '../types'
import type { Tx } from '../../../types'
import { In, Increment } from '../../../queryBuilder'
import { basePG } from '../base'
import { pg } from '../index'

const noop = () => {}
const asyncNoop = async () => {}

let sqlRows = [] as [string, any[] | null][]

const getSqlRow = (index: number = 0) => {
  const data = sqlRows[index] ?? ['', null]

  return {sql: data[0], values: data[1]}
}

const clearSqlRows = () => sqlRows = []

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

const mockBase = () => basePG({}, noop, async () => new Pool())
const mockDriver = () => pg({
  config: {},
  ormLog: noop,
  mockBase,
})

interface User {
  id: number
  name: string
  age: number | null
  addictions: number[]
}

describe('driver/pg/base', () => {
  const userModel = async () => (await mockDriver()).buildModelMethods<User>({
    primaryKey: 'id',
    table: 'users',
    mapping: {
      id: 'id',
      name: 'name',
      age: 'age',
      addictions: 'addictions',
    },
    repos: {},
  })


  afterEach(clearSqlRows)

  test('should basePG call method query and log SQL', async () => {
    const base = await mockBase()

    await base.query('SELECT 1')

    expect(getSqlRow().sql).toEqual('SELECT 1')
  })

  test('should be currect sql update query with sql operator', async () => {
    await (await userModel()).update({
      where: {
        id: In([1, 2, 3]),
      },
      set: {
        age: 3,
      },
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = $1 WHERE "id" = ANY($2)')
    expect(values).toEqual([3, [1, 2, 3]])
  })

  test('should be currect sql update query by id', async () => {
    await (await userModel()).update({
      where: 1,
      set: {
        age: 3,
      },
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = $1 WHERE "id" = $2')
    expect(values).toEqual([3, 1])
  })

  test('should be currect sql update query when set array or null value', async () => {
    await (await userModel()).update({
      where: 2,
      set: {
        addictions: [1],
        age: null,
      },
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "addictions" = $1, "age" = $2 WHERE "id" = $3')
    expect(values).toEqual([[1], null, 2])
  })

  test('should be currect sql update query with returning flag', async () => {
    await (await userModel()).update({
      where: 4,
      set: {
        age: 3,
      },
      returning: true,
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual([
      'UPDATE "users" SET "age" = $1 WHERE "id" = $2',
      'RETURNING "id", "name", "age", "addictions"',
    ].join(' '))
    expect(values).toEqual([3, 4])
  })

  test('should be currect sql update query with returning flag with specific columns', async () => {
    await (await userModel()).update({
      where: 4,
      set: {
        age: 3,
      },
      returning: ['id', 'name'],
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual([
      'UPDATE "users" SET "age" = $1 WHERE "id" = $2',
      'RETURNING "id", "name"',
    ].join(' '))
    expect(values).toEqual([3, 4])
  })

  test('should be currect sql update query with set-operator', async () => {
    await (await userModel()).update({
      where: 4,
      set: {
        age: Increment(2),
      },
      returning: ['id', 'name'],
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual([
      'UPDATE "users" SET "age" = "age" + $1 WHERE "id" = $2',
      'RETURNING "id", "name"',
    ].join(' '))
    expect(values).toEqual([2, 4])
  })
})
