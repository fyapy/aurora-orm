import path from 'node:path'
import { idColumn, migrationsTable, nameColumn, runOnColumn } from './constants.js'
import { connectDB, DBConnection } from './db.js'
import { migration } from './migration.js'
import { Migration, RunMigrationsOptions } from './types.js'
import { loadMigrationFiles } from './utils.js'
import { Migrator } from '../orm/driverAdapters/types.js'

async function loadMigrations(db: DBConnection, migrator: Migrator) {
  try {
    const dir = '/migrations'
    const files = await loadMigrationFiles(dir)

    return (
      await Promise.all(files.map(async file => {
        const filePath = `${dir}/${file}`
        const fullPath = path.join(process.cwd(), filePath)
        const actionPath = `file://${fullPath.replace(/\\/g, '/')}`

        return migration({
          actionPath,
          filePath,
          migrator,
          db,
        })
      }))
    ).sort((m1, m2) => {
      const compare = m1.timestamp - m2.timestamp

      return compare !== 0 ? compare : m1.name.localeCompare(m2.name)
    })
  } catch (e: any) {
    throw new Error(`Can't get migration files: ${e.stack}`)
  }
}

async function ensureMigrationsTable(migrator: Migrator) {
  try {
    const migrationTables = await migrator.tables()

    if (migrationTables.length === 0) {
      await migrator.createTable()
    }
  } catch (e: any) {
    throw new Error(`Unable to ensure migrations table: ${e.stack}`)
  }
}


function getMigrationsToRun(options: RunMigrationsOptions, runNames: string[], migrations: Migration[]): Migration[] {
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

export async function runMigrationsSilent(options: RunMigrationsOptions) {
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

    const [runList, migrations] = await Promise.all([
      migrator.selectAll<{name: string}>(),
      loadMigrations(db, migrator),
    ])

    if (runList.length === 0 && typeof db.driver.prepareDatabase !== 'undefined') {
      await db.driver.prepareDatabase()
    }

    const toRun: Migration[] = getMigrationsToRun(options, runList.map(item => item[nameColumn]), migrations)

    if (toRun.length === 0) {
      console.info('> No migrations to run!')
      return
    }

    console.info('> Migrating files:')
    toRun.forEach(m => console.info(`> ${m.name}`))


    for (const migration of migrations) {
      console.info(`> Run: ${migration.name} (${options.direction})`)
      await migration.apply(options.direction)
    }
  } catch (e) {
    throw e
  } finally {
    if (db.connected()) {
      db.close()
    }
  }
}

export async function runMigrations(options: RunMigrationsOptions) {
  try {
    await runMigrationsSilent(options)

    console.log('Migrations complete!')
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
