import path from 'node:path'
import { idColumn, migrationsTable, nameColumn, runOnColumn } from './constants'
import { connectDB, DBConnection } from './db'
import { migration } from './migration'
import { Migration, MigrationDirection, RunnerOptionConfig } from './types'
import { loadMigrationFiles } from './utils'
import { Migrator } from '../orm/driverAdapters/types'

async function loadMigrations(db: DBConnection, migrator: Migrator) {
  try {
    const dir = '/migrations'
    const files = await loadMigrationFiles(dir)

    return (
      await Promise.all(files.map(async file => {
        const filePath = `${dir}/${file}`
        const fullPath = path.join(process.cwd(), filePath)

        const actions = require(path.relative(__dirname, fullPath))

        return migration({
          migrator,
          filePath,
          actions,
          db,
        })
      }))
    ).sort((m1, m2) => {
      const compare = m1.timestamp - m2.timestamp
      if (compare !== 0) return compare
      return m1.name.localeCompare(m2.name)
    })
  } catch (err: any) {
    throw new Error(`Can't get migration files: ${err.stack}`)
  }
}

async function ensureMigrationsTable(migrator: Migrator) {
  try {
    const migrationTables = await migrator.tables()

    if (migrationTables.length === 0) {
      await migrator.createTable()
    }
  } catch (err: any) {
    throw new Error(`Unable to ensure migrations table: ${err.stack}`)
  }
}

async function getRunMigrations(migrator: Migrator): Promise<string[]> {
  const list = await migrator.selectAll()

  return list.map(item => item[nameColumn])
}


function getMigrationsToRun(options: RunnerOptionConfig, runNames: string[], migrations: Migration[]): Migration[] {
  if (options.direction === 'down') {
    const downMigrations: Array<string | Migration> = runNames
      .map((migrationName) => migrations.find(({ name }) => name === migrationName) || migrationName)

    const toRun = downMigrations.slice(-Math.abs(1)).reverse()

    const deletedMigrations = toRun.filter((migration): migration is string => typeof migration === 'string')
    if (deletedMigrations.length) {
      const deletedMigrationsStr = deletedMigrations.join(', ')
      throw new Error(`Definitions of migrations ${deletedMigrationsStr} have been deleted.`)
    }
    return toRun as Migration[]
  }

  const upMigrations = migrations.filter(({ name }) => runNames.indexOf(name) < 0)
  const count = Infinity

  return upMigrations.slice(0, Math.abs(count))
}

async function runMigrations({ migrations, direction }: {
  migrations: Migration[]
  direction: MigrationDirection
}) {
  for (const m of migrations) {
    console.info(`> Run: ${m.name} (${direction})`)
    await m.apply(direction)
  }
}

export async function runner(options: RunnerOptionConfig) {
  const db = await connectDB(options.config)

  try {
    await db.createConnection()

    const migrator = db.driver.migrator({
      migrationsTable,
      runOnColumn,
      nameColumn,
      idColumn,
    })

    await ensureMigrationsTable(migrator)

    const [migrations, runNames] = await Promise.all([
      loadMigrations(db, migrator),
      getRunMigrations(migrator),
    ])

    if (runNames.length === 0 && typeof db.driver.prepareDatabase !== 'undefined') {
      await db.driver.prepareDatabase()
    }

    const toRun: Migration[] = getMigrationsToRun(options, runNames, migrations)

    if (toRun.length === 0) {
      console.info('> No migrations to run!')
      return
    }

    // TODO: add some fancy colors to logging
    console.info('> Migrating files:')
    toRun.forEach(m => console.info(`> - ${m.name}`))


    await runMigrations({
      migrations: toRun,
      direction: options.direction,
    })
  } catch (err) {
    throw err
  } finally {
    if (db.connected()) {
      db.close()
    }
  }
}
