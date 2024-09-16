import path from 'node:path'

import {migrationsTable, runOnColumn, nameColumn, idColumn} from './constants.js'
import {RunMigrationsOptions, RunMigration, Migration, Logger} from './types.js'
import {loadMigrationFilePaths} from './utils.js'
import {Migrator} from '../orm/drivers/types.js'
import {DBConnection, connectDB} from './db.js'
import {migration} from './migration.js'

async function loadMigrations(
  logger: Logger,
  db: DBConnection,
  migrator: Migrator,
  directory = path.join(process.cwd(), '/migrations'),
) {
  try {
    const filePaths = await loadMigrationFilePaths(directory)

    return filePaths
      .map(filePath => migration({filePath, migrator, logger, db}))
      .sort((m1, m2) => {
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
    const downMigrations: Array<Migration | string> = runNames
      .map((migrationName) => migrations.find(({name}) => name === migrationName) || migrationName)

    const toRun = downMigrations.slice(-Math.abs(1)).reverse()

    const deletedMigrations = toRun.filter((migration): migration is string => typeof migration === 'string')
    if (deletedMigrations.length) {
      const deletedMigrationsStr = deletedMigrations.join(', ')
      throw new Error(`Definitions of migrations ${deletedMigrationsStr} have been deleted.`)
    }
    return toRun as Migration[]
  }

  const upMigrations = migrations.filter(({name}) => runNames.indexOf(name) < 0)
  const count = Infinity

  return upMigrations.slice(0, Math.abs(count))
}

export async function runMigrationsSilent(options: RunMigrationsOptions) {
  const db = await connectDB(options.config)
  const logger = options.logger ?? console.info

  try {
    await db.createConnection()

    const migrator = db.driver.migrator({
      migrationsTable,
      runOnColumn,
      nameColumn,
      idColumn,
    })

    await ensureMigrationsTable(migrator)

    const [migrations, runList] = await Promise.all([
      loadMigrations(logger, db, migrator, options.directory),
      migrator.selectAll<RunMigration>(),
    ])

    if (runList.length === 0 && typeof db.driver.prepareDatabase !== 'undefined') {
      await db.driver.prepareDatabase()
    }

    const toRun: Migration[] = getMigrationsToRun(options, runList.map(item => item[nameColumn]), migrations)

    if (toRun.length === 0) {
      return logger('> No migrations to run!')
    }

    logger('> Migrating files:')
    toRun.forEach(m => logger(`> File: ${m.name}`))


    for (const migration of migrations) {
      logger(`> Run: ${migration.name} (${options.direction})`)
      await migration.apply(options.direction)
    }

    logger('> Migrations complete!')
  } catch (e) {
    throw e
  } finally {
    if (db.connected()) {
      await db.close()
    }
  }
}

export async function runMigrationsAndExit(options: RunMigrationsOptions) {
  try {
    await runMigrationsSilent(options)

    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}
