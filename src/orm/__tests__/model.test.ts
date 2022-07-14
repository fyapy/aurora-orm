import { clearSqlRows, getSqlRow, mockQueryRow } from '../../utils/jest'
import { createModel } from '../model'
import { In } from '../queryBuilder'

interface User {
  id: number
  name: string
  age: number | null
  addictions: number[]
}
const returning = ' RETURNING "id", "name", "age", "addictions"'

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
      id: In([1, 2, 3]),
    }, {
      age: 3,
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual(`UPDATE "users" SET "age" = $1 WHERE "id" = ANY($2)${returning}`)
    expect(values).toEqual([3, [1, 2, 3]])
  })

  test('should be currect sql update query by id', async () => {
    await userModel.update(1, {
      age: 3,
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual(`UPDATE "users" SET "age" = $1 WHERE "id" = $2${returning}`)
    expect(values).toEqual([3, 1])
  })

  test('should be currect sql update query when set array or null value', async () => {
    await userModel.update(2, {
      addictions: [1],
      age: null,
    })

    const [sql, values] = getSqlRow()

    expect(sql).toEqual(`UPDATE "users" SET "addictions" = $1, "age" = $2 WHERE "id" = $3${returning}`)
    expect(values).toEqual([[1], null, 2])
  })
})
