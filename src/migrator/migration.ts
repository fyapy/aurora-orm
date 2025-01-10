import * as tsx from 'tsx/esm/api'
import path from 'node:path'
import url from 'node:url'

import type {MigrationBuilderActions, MigrationDirection, Migration, Logger} from './types.js'
import type {DBConnection} from './db.js'

import {emptyArray, column, uuidV4, now} from './queryBuilder.js'
import {Migrator} from '../orm/drivers/types.js'

const defs = {now, uuidV4, emptyArray}

export function migration({db, filePath, migrator, logger}: {
  db: DBConnection
  filePath: string
  migrator: Migrator
  logger: Logger
}): Migration {
  const name = path.basename(filePath, path.extname(filePath))
  const timestamp = Number(name.split('_')[0])

  let _actions: MigrationBuilderActions

  async function getActions() {
    if (typeof _actions !== 'undefined') {
      return _actions
    }

    _actions = (await tsx.tsImport(url.pathToFileURL(filePath).href, import.meta.url)).default

    return _actions
  }

  async function apply(direction: MigrationDirection) {
    const actions =  await getActions()
    const action = actions[direction]

    if (typeof action !== 'function') {
      throw new Error(`Unknown value for direction: ${direction}. Is the migration ${name} exporting a '${direction}' function?`)
    }

    await db.driver.begin(async tx => {
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
        logger(`> Completed: ${name} (down)`)
        await migrator.delete(name, tx)
      }
      if (action === actions.up) {
        logger(`> Completed: ${name} (up)`)
        await migrator.insert(name, tx)
      }
    })
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
