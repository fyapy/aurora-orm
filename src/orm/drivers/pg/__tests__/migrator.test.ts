import {afterEach, describe, expect, test} from 'vitest'

import {dropConstraint, createTable, alterTable, emptyArray, foreignKey, addColumn, column, insert, uuidV4, now} from '../../../../migrator/queryBuilder.js'
import {createFakePool, clearSqlRows, getSqlRow} from '../../../../utils/tests.js'
import {migratorAstParsers} from '../../../../utils/sql.js'

describe('driver/pg/migrator', () => {
  const methods = migratorAstParsers()

  afterEach(clearSqlRows)

  test('should basePG call method query and log SQL', async () => {
    const base = createFakePool()

    await base.query('SELECT 1')

    expect(getSqlRow().sql).toEqual('SELECT 1')
  })

  test('should generate currect alter table SQL', async () => {
    const alterSql = methods.parseAlterTable(
      alterTable('users', {
        created_at: addColumn({type: 'timestamptz', notNull: true, default: now})
      })
    )

    expect(alterSql).toEqual('ALTER TABLE "users" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT (now())')
  })

  test('should generate currect create table SQL', async () => {
    const createSql = methods.parseCreateTable(
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
    const createSql = methods.parseForeignKey(
      foreignKey({table: 'panel_user_roles', key: 'user_id'}, {table: 'panel_users', key: 'id'})
    )

    expect(createSql).toEqual('ALTER TABLE "panel_user_roles" ADD FOREIGN KEY ("user_id") REFERENCES "panel_users" ("id") ON DELETE CASCADE')
  })


  test('should generate currect drop constraint key SQL', async () => {
    const createSql = methods.parseDropConstraint(
      dropConstraint('users', 'city_id')
    )

    expect(createSql).toEqual('ALTER TABLE "users" DROP CONSTRAINT "users_city_id_fkey"')
  })

  test('should generate currect insert SQL', async () => {
    const createSql = methods.parseInsert(
      insert('users', {name: 'Lera', age: 20, active: true})
    )

    expect(createSql).toEqual('INSERT INTO "users" (name, age, active) VALUES (\'Lera\', 20, true)')
  })

  test('should generate currect create table SQL with emptyArray', async () => {
    const createSql = methods.parseCreateTable(
      createTable('users', {list: column({type: 'varchar', default: emptyArray})})
    )

    expect(createSql).toEqual('CREATE TABLE "users" ("list" varchar DEFAULT \'{}\')')
  })
})
