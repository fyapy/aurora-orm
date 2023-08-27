import type { Migration, MigrationAction, MigrationBuilderActions, MigrationDirection } from './types'
import type { DBConnection } from './db'
import type { Tx } from '../orm/types'
import path from 'node:path'
import { column, now, uuidGenerateV4 } from './queryBuilder'
import { Migrator } from '../orm/driverAdapters/types'

const defs = {now, uuidGenerateV4}

export function migration({db, actions, filePath, migrator}: {
  db: DBConnection
  filePath: string
  actions: MigrationBuilderActions
  migrator: Migrator
}): Migration {
  const name = path.basename(filePath, path.extname(filePath))
  const timestamp = Number(name.split('_')[0])

  function getAction(direction: MigrationDirection) {
    const action = actions[direction]

    if (typeof action !== 'function') {
      throw new Error(
        `Unknown value for direction: ${direction}. Is the migration ${name} exporting a '${direction}' function?`,
      )
    }

    return action
  }

  async function markAsRun(action: MigrationAction, tx: Tx) {
    if (action === actions.down) {
      console.info(`### MIGRATION ${name} (DOWN) ###`)
      return await migrator.delete(name, tx)
    }
    if (action === actions.up) {
      console.info(`### MIGRATION ${name} (UP) ###`)
      return await migrator.insert(name, tx)
    }

    throw new Error('Unknown direction')
  }

  async function apply(direction: MigrationDirection) {
    const action = getAction(direction)

    const tx = await db.driver.startTrx()
    try {
      await action({
        sql: {
          ...db,
          query: (sql, values) => db.query(sql, values, tx),
          createTable: (table, columns) => db.createTable(table, columns, tx),
          dropTable: table => db.dropTable(table, tx),
          alterTable: (table, columns) => db.alterTable(table, columns, tx),
        },
        column,
        defs,
      })

      await markAsRun(action, tx)
      await db.driver.commit(tx)
    } catch (err) {
      await db.driver.rollback(tx)
      throw err
    }
  }

  return {
    name,
    db,
    timestamp,
    path: filePath,
    up: actions.up,
    down: actions.down,
    apply,
  }
}
