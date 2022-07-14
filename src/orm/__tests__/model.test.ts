import { clearSqlRows, getSqlRow, mockQueryRow } from '../../utils/jest'
import { createModel } from '../model'
import { In } from '../queryBuilder'

interface User {
  id: number
  name: string
  age: number
}

describe('orm/model', () => {
  const userModel = createModel<User>({
    table: 'users',
    mapping: {
      id: 'id',
      name: 'name',
      age: 'age',
    },
    queryRow: mockQueryRow,
  })

  afterEach(clearSqlRows)

  test('should be currect sql update query with sql operator', async () => {
    await userModel.update({
      id: In([1, 2, 3]),
    }, {
      age: 3,
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = $1 WHERE "id" = ANY($2) RETURNING "id", "name", "age"')
    expect(values).toEqual([3, [1, 2, 3]])
  })

  test('should be currect sql update query by id', async () => {
    await userModel.update(1, {
      age: 3,
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual('UPDATE "users" SET "age" = $1 WHERE "id" = $2 RETURNING "id", "name", "age"')
    expect(values).toEqual([3, 1])
  })
})
