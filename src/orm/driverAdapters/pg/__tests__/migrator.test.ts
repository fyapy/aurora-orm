import {afterEach, describe, expect, test} from 'vitest'

import {dropConstraint, createTable, alterTable, emptyArray, foreignKey, addColumn, column, insert, uuidV4, now} from '../../../../migrator/queryBuilder.js'
import {clearSqlRows, getSqlRow, mockBase} from '../../../../utils/tests.js'

describe('driver/pg/migrator', () => {
  afterEach(clearSqlRows)

  test('should basePG call method query and log SQL', async () => {
    const base = await mockBase()

    await base.query('SELECT 1')

    expect(getSqlRow().sql).toEqual('SELECT 1')
  })

  test('should generate currect alter table SQL', async () => {
    const base = await mockBase()

    const alterSql = base.parseAlterTable(
      alterTable('users', {
        created_at: addColumn({type: 'timestamptz', notNull: true, default: now})
      })
    )

    expect(alterSql).toEqual('ALTER TABLE "users" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT (now())')
  })

  test('should generate currect create table SQL', async () => {
    const base = await mockBase()

    const createSql = base.parseCreateTable(
      createTable('users', {
        id: column({type: 'uuid', primary: true, default: uuidV4}),
        created_at: column({type: 'timestamptz', notNull: true, default: now})
      })
    )

    expect(createSql).toEqual([
      'CREATE TABLE "users"',
      '("id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(), "created_at" timestamptz NOT NULL DEFAULT (now()))',
    ].join(' '))
  })

  test('should generate currect add foreign key SQL', async () => {
    const base = await mockBase()

    const createSql = base.parseForeignKey(
      foreignKey({table: 'panel_user_roles', key: 'user_id'}, {table: 'panel_users', key: 'id'})
    )

    expect(createSql).toEqual('ALTER TABLE "panel_user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "panel_users" ("id") ON DELETE CASCADE')
  })


  test('should generate currect drop constraint key SQL', async () => {
    const base = await mockBase()

    const createSql = base.parseDropConstraint(
      dropConstraint('users', 'city_id')
    )

    expect(createSql).toEqual('ALTER TABLE "users" DROP CONSTRAINT "users_city_id_fkey"')
  })

  test('should generate currect insert SQL', async () => {
    const base = await mockBase()

    const createSql = base.parseInsert(
      insert('users', {name: 'Lera', age: 20, active: true})
    )

    expect(createSql).toEqual('INSERT INTO "users" (name, age, active) VALUES (\'Lera\', 20, true)')
  })

  test('should generate currect create table SQL with emptyArray', async () => {
    const base = await mockBase()

    const createSql = base.parseCreateTable(
      createTable('users', {list: column({type: 'varchar', default: emptyArray})})
    )

    expect(createSql).toEqual('CREATE TABLE "users" ("list" varchar DEFAULT \'{}\')')
  })
})
