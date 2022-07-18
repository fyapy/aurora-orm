import { clearSqlRows, getSqlRow, mockQueryRow } from '../../utils/jest'
import { createModel } from '../model'
import { In } from '../queryBuilder'

interface User {
  id: number
  name: string
  age: number | null
  addictions: number[]
}

describe('orm/model', () => {
  const userModel = createModel<User>({
    table: 'users',
    mapping: {
      id: 'id',
      name: 'name',
      age: 'age',
      addictions: 'addictions',
    },
    queryRow: mockQueryRow,
  })

  afterEach(clearSqlRows)

  test('should be currect sql update query with sql operator', async () => {
    await userModel.update({
      where: {
        id: In([1, 2, 3]),
      },
      set: {
        age: 3,
      },
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = ? WHERE "id" = ANY(?)')
    expect(values).toEqual([3, [1, 2, 3]])
  })

  test('should be currect sql update query by id', async () => {
    await userModel.update({
      where: 1,
      set: {
        age: 3,
      },
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = ? WHERE "id" = ?')
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

    const [sql, values] = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "addictions" = ?, "age" = ? WHERE "id" = ?')
    expect(values).toEqual([[1], null, 2])
  })

  test('should be currect sql update query with returning flag', async () => {
    await userModel.update({
      where: 4,
      set: {
        age: 3,
      },
      returning: true,
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual([
      'UPDATE "users" SET "age" = ? WHERE "id" = ?',
      'RETURNING "id", "name", "age", "addictions"',
    ].join(' '))
    expect(values).toEqual([3, 4])
  })

  test('should be currect sql update query with returning flag with specific columns', async () => {
    await userModel.update({
      where: 4,
      set: {
        age: 3,
      },
      returning: ['id', 'name'],
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual([
      'UPDATE "users" SET "age" = ? WHERE "id" = ?',
      'RETURNING "id", "name"',
    ].join(' '))
    expect(values).toEqual([3, 4])
  })
})
