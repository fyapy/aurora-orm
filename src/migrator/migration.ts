import type { Migration, MigrationAction, MigrationBuilderActions, MigrationDirection } from './types'
import type { DBConnection } from './db'
import path from 'node:path'
import { migrationsTable, schema } from './constants'

function getTimestamp(filename: string): number {
  const prefix = filename.split('_')[0]
  if (prefix && /^\d+$/.test(prefix)) {
    if (prefix.length === 13) {
      // timestamp: 1391877300255
      return Number(prefix)
    }
    if (prefix && prefix.length === 17) {
      // utc: 20200513070724505
      const year = prefix.substring(0, 4)
      const month = prefix.substring(4, 2)
      const date = prefix.substring(6, 2)
      const hours = prefix.substring(8, 2)
      const minutes = prefix.substring(10, 2)
      const seconds = prefix.substring(12, 2)
      const ms = prefix.substring(14)
      return new Date(`${year}-${month}-${date}T${hours}:${minutes}:${seconds}.${ms}Z`).valueOf()
    }
  }
  console.error(`Can't determine timestamp for ${prefix}`)
  return Number(prefix) || 0
}

export function migration({ db, databases, actions, filePath }: {
  db: DBConnection
  databases: Record<string, DBConnection>
  filePath: string
  actions: MigrationBuilderActions,
}): Migration {
  const name = path.basename(filePath, path.extname(filePath))

  function _getAction(direction: MigrationDirection) {
    const action = actions[direction]

    if (typeof action !== 'function') {
      throw new Error(
        `Unknown value for direction: ${direction}. Is the migration ${name} exporting a '${direction}' function?`,
      )
    }

    return action
  }

  function _getMarkAsRun(action: MigrationAction) {
    switch (action) {
      case actions.down:
        console.info(`### MIGRATION ${name} (DOWN) ###`)
        return `DELETE FROM "${schema}"."${migrationsTable}" WHERE name='${name}';`
      case actions.up:
        console.info(`### MIGRATION ${name} (UP) ###`)
        return `INSERT INTO "${schema}"."${migrationsTable}" (name, run_on) VALUES ('${name}', NOW());`
      default:
        throw new Error('Unknown direction')
    }
  }

  async function apply(direction: MigrationDirection) {
    const action = _getAction(direction)

    await db.query('BEGIN')
    try {
      await action({ sql: db, databases })

      await db.query(_getMarkAsRun(action))
      await db.query('COMMIT')
    } catch (err) {
      await db.query('ROLLBACK')
      throw err
    }
  }

  return {
    name,
    db,
    path: filePath,
    timestamp: getTimestamp(name),
    up: actions.up,
    down: actions.down,
    apply,
  }
}
