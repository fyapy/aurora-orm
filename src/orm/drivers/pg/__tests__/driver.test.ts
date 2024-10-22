import {afterEach, beforeAll, describe, expect, test} from 'vitest'

import type {Model} from '../../../types.js'

import {clearSqlRows, fakeDriver, getSqlRow} from '../../../../utils/tests.js'
import {Increment, Includes, In} from '../../../operators.js'
import {createTestModels} from './createTestModels.js'
import {createModel} from '../../../model.js'

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


  test('should be currect sql findAll with sql Includes operator', async () => {
    const altModel = createModel<{alt: string[]}>({
      mockDriver: await fakeDriver(),
      table: 'users',
      mapping: {alt: 'alt'},
    })

    await altModel.findAll({alt: Includes('1')})

    const {sql, values} = getSqlRow()

    expect(sql).toEqual('SELECT "alt" FROM "users" WHERE $1 = ANY("alt")')
    expect(values).toEqual(['1'])
  })

  test('should be currect sql when join and select used at sametime', async () => {
    const {GameModel} = await createTestModels()

    await GameModel.findAll({
      orderBy: {sort: 'DESC'},
      skip: 0,
      limit: 12,
      where: {},
      select: ['id', 'name', 'slug'],
      join: [
        ['childs', ['id', 'name', 'isPublished', 'gameId']],
      ],
    })

    const games = getSqlRow(0)
    const childs = getSqlRow(1)

    expect(games.sql).toEqual('SELECT "id", "name", "slug" FROM "games"  ORDER BY "sort" DESC OFFSET 0 LIMIT 12')
    expect(games.values).toEqual([])

    expect(childs.sql).toEqual('SELECT "id", "name", "isPublished", "gameId", "id" FROM "childs" WHERE "gameId" = ANY($1)')
    expect(childs.values).toEqual([['id1']])



    await GameModel.findAll({
      orderBy: {sort: 'DESC'},
      skip: 0,
      limit: 12,
      where: {},
      select: ['name', 'slug'],
      join: [
        ['childs', ['id', 'name', 'isPublished', 'gameId']], // TODO: normalize when 'gameId' omited
      ],
    })

    const games2 = getSqlRow(2)
    const childs2 = getSqlRow(3)

    expect(games2.sql).toEqual('SELECT "name", "slug", "id" FROM "games"  ORDER BY "sort" DESC OFFSET 0 LIMIT 12')
    expect(games2.values).toEqual([])

    expect(childs2.sql).toEqual('SELECT "id", "name", "isPublished", "gameId", "id" FROM "childs" WHERE "gameId" = ANY($1)')
    expect(childs2.values).toEqual([['id1']])
  })
})
