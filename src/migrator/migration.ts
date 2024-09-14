import type { Migration, MigrationBuilderActions, MigrationDirection } from './types.js'
import type { DBConnection } from './db.js'
import * as tsx from 'tsx/esm/api'
import path from 'node:path'
import { column, now, uuidV4, emptyArray } from './queryBuilder.js'
import { Migrator } from '../orm/driverAdapters/types.js'

const defs = {now, uuidV4, emptyArray}

export function migration({db, actionPath, filePath, migrator}: {
  db: DBConnection
  filePath: string
  actionPath: string
  migrator: Migrator
}): Migration {
  const name = path.basename(filePath, path.extname(filePath))
  const timestamp = Number(name.split('_')[0])

  let _actions: MigrationBuilderActions

  async function getActions() {
    if (typeof _actions !== 'undefined') {
      return _actions
    }

    _actions = filePath.endsWith('.ts')
      ? (await tsx.tsImport(actionPath, import.meta.url)).default
      : (await import(actionPath)).default

    return _actions
  }

  async function apply(direction: MigrationDirection) {
    const actions =  await getActions()
    const action = actions[direction]

    if (typeof action !== 'function') {
      throw new Error(`Unknown value for direction: ${direction}. Is the migration ${name} exporting a '${direction}' function?`)
    }

    const tx = await db.driver.startTrx()
    try {
      await action({
        sql: {
          ...db,
          createTable: (table, columns) => db.createTable(table, columns, tx),
          dropTable: table => db.dropTable(table, tx),
          alterTable: (table, columns) => db.alterTable(table, columns, tx),
          foreignKey: (foreign, reference) => db.foreignKey(foreign, reference, tx),
          dropConstraint: (table, column) => db.dropConstraint(table, column, tx),
          insert: (table, values) => db.insert(table, values, tx),
        },
        column,
        defs,
      })


      // mark as run
      if (action === actions.down) {
        console.info(`### MIGRATION ${name} (DOWN) ###`)
        return await migrator.delete(name, tx)
      }
      if (action === actions.up) {
        console.info(`### MIGRATION ${name} (UP) ###`)
        return await migrator.insert(name, tx)
      }

      await db.driver.commit(tx)
    } catch (e) {
      await db.driver.rollback(tx)
      throw e
    }
  }

  return {
    db,
    name,
    timestamp,
    path: filePath,
    getActions,
    apply,
  }
}
