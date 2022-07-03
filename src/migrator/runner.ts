import path from 'node:path'
import { connectDB } from './db'
import { migration } from './migration'
import { Migration, MigrationDirection, RunnerOptionConfig } from './types'
import { loadMigrationFiles } from './utils'


const fullTableName = 'pgmigrations'
const idColumn = 'id'
const nameColumn = 'name'
const runOnColumn = 'run_on'

const schema = 'public'

async function loadMigrations(db: ReturnType<typeof connectDB>) {
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

async function ensureMigrationsTable(db: ReturnType<typeof connectDB>) {
  try {
    const migrationsTable = fullTableName

    const migrationTables = await db.select(
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

async function getRunMigrations(db: ReturnType<typeof connectDB>) {
  return db.column(nameColumn, `SELECT ${nameColumn} FROM ${fullTableName} ORDER BY ${runOnColumn}, ${idColumn}`)
}


function getMigrationsToRun(options: RunnerOptionConfig, runNames: string[], migrations: Migration[]): Migration[] {
  if (options.direction === 'down') {
    const downMigrations: Array<string | Migration> = runNames
      // .filter((migrationName) => !options.file || options.file === migrationName)
      .map((migrationName) => migrations.find(({ name }) => name === migrationName) || migrationName)
    // const { count = 1 } = options
    const count = 1

    const toRun = (
      downMigrations.filter((migration) => typeof migration === 'object' && migration.timestamp >= count)
    ).reverse()
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

function runMigrations({ migrations, direction }: {
  migrations: Migration[]
  direction: MigrationDirection
}) {
  return migrations.reduce(
    (promise: Promise<unknown>, migration) => promise.then(() => migration.apply(direction)),
    Promise.resolve(),
  )
}


export async function runner(options: RunnerOptionConfig) {
  const db = connectDB(options.databaseUrl)

  try {
    await db.createConnection()

    await ensureMigrationsTable(db)

    const [migrations, runNames] = await Promise.all([
      loadMigrations(db),
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
  } finally {
    if (db.connected()) {
      db.close()
    }
  }
}
