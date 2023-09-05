import type { Model } from '../../../types'
import { createModel } from '../../../model'
import { In, Increment } from '../../../operators'
import { fakeDriver, clearSqlRows, getSqlRow } from '../../../../utils/jest'

interface User {
  id: number
  name: string
  age: number | null
  addictions: number[]
}

describe('driver/pg/base', () => {
  let userModel: Model<User>

  beforeAll(async () => {
    userModel = createModel<User>({
      mockDriver: await fakeDriver(),
      primaryKey: 'id',
      table: 'users',
      mapping: {
        id: 'id',
        name: 'name',
        age: 'age',
        addictions: 'addictions',
      },
    })
  })

  afterEach(clearSqlRows)

  test('should be currect sql update query with sql operator', async () => {
    await userModel.update({
      where: {id: In([1, 2, 3])},
      set: {age: 3},
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = $1 WHERE "id" = ANY($2)')
    expect(values).toEqual([3, [1, 2, 3]])
  })

  test('should be currect sql update query by id', async () => {
    await userModel.update({
      where: 1,
      set: {age: 3},
    })

    const {sql, values} = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = $1 WHERE "id" = $2')
    expect(values).toEqual([3, 1])
  })

  test('should be currect sql update query when set array or null value', async () => {
    await userModel.update({
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
    await userModel.update({
      where: 4,
      set: {age: 3},
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
    await userModel.update({
      where: 4,
      set: {age: 3},
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
    await userModel.update({
      where: 4,
      set: {age: Increment(2)},
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
