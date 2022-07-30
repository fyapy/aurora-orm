import path from 'node:path'
import { connectDB, DBConnection } from './db'
import { migration } from './migration'
import { Migration, MigrationDirection, RunnerOptionConfig } from './types'
import { loadMigrationFiles } from './utils'


const fullTableName = 'pgmigrations'
const idColumn = 'id'
const nameColumn = 'name'
const runOnColumn = 'run_on'

const schema = 'public'

async function loadMigrations(db: DBConnection, databases: Record<string, DBConnection>) {
  try {
    const dir = '/migrations'

    const files = await loadMigrationFiles(dir)

    return (
      await Promise.all(files.map(async file => {
        const filePath = `${dir}/${file}`
        const fullPath = path.join(process.cwd(), filePath)

        const actions = require(path.relative(__dirname, fullPath))

        return migration({
          db,
          databases,
          filePath,
          actions,
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

// TODO: move code to driverAdapters
async function ensureMigrationsTable(db: DBConnection) {
  try {
    const migrationsTable = fullTableName

    const migrationTables = await db.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}' AND table_name = '${migrationsTable}'`,
    )

    if (migrationTables.length === 0) {
      await db.query(
        `CREATE TABLE ${fullTableName} (${idColumn} SERIAL PRIMARY KEY, ${nameColumn} varchar(255) NOT NULL, ${runOnColumn} timestamp NOT NULL)`
      )
    }
  } catch (err: any) {
    throw new Error(`Unable to ensure migrations table: ${err.stack}`)
  }
}

async function getRunMigrations(db: DBConnection) {
  const list = await db.query(`SELECT ${nameColumn} FROM ${fullTableName} ORDER BY ${runOnColumn}, ${idColumn}`)

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

async function connectionsForMigrations(options: RunnerOptionConfig): Promise<{
  db: DBConnection
  databases: Record<string, DBConnection>
}> {
  if (Array.isArray(options.config)) {
    const migrationsConfig = options.migrationsConfig!

    const db = await connectDB(migrationsConfig)
    const connections = await Promise.all(options.config.map(config => {
      if (config.name === migrationsConfig.name) {
        return Promise.resolve(null)
      }

      return connectDB(config)
    }))

    const databases = options.config.reduce((acc, config, index) => {
      acc[config.name!] = config.name === migrationsConfig.name
        ? db
        : connections[index]

      return acc
    }, {})

    return {
      db,
      databases,
    }
  }

  const db = await connectDB(options.config)

  return {
    db,
    databases: {
      [options.config.name ?? 'default']: db,
    },
  }
}

export async function runner(options: RunnerOptionConfig) {
  const { db, databases } = await connectionsForMigrations(options)

  try {
    await db.createConnection()

    await ensureMigrationsTable(db)

    const [migrations, runNames] = await Promise.all([
      loadMigrations(db, databases),
      getRunMigrations(db),
    ])

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
