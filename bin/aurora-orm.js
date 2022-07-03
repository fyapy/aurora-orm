#!/usr/bin/env node

'use strict'

const util = require('node:util')
const yargs = require('yargs')
const ConnectionParameters = require('pg/lib/connection-parameters')
const { createMigration, runner } = require('../dist/migrator')

process.on('uncaughtException', (err) => {
  console.error(err)
  process.exit(1)
})

function tryRequire(moduleName) {
  try {
    return require(moduleName)
  } catch (err) {
    if (err.code !== 'MODULE_NOT_FOUND') {
      throw err
    }
    return null
  }
}

const envPathArg = 'envPath'
const databaseUrlVarArg = 'database-url-var'

const { argv } = yargs.usage('Usage: $0 [up|down|create] [migrationName]')
  .option('d', {
    alias: databaseUrlVarArg,
    default: 'DATABASE_URL',
    describe: 'Name of env variable where is set the databaseUrl',
    type: 'string',
  })
  .option(envPathArg, {
    describe: 'Path to the .env file that should be used for configuration',
    type: 'string',
  })


const dotenv = tryRequire('dotenv')
if (dotenv) {
  const envPath = argv[envPathArg]

  // Create default dotenv config
  const dotenvConfig = {
    silent: true,
    ...(envPath ? { path: envPath } : undefined)
  }

  // Load config from ".env" file
  const myEnv = dotenv.config(dotenvConfig)
  const dotenvExpand = tryRequire('dotenv-expand')
  if (dotenvExpand && dotenvExpand.expand) {
    dotenvExpand.expand(myEnv)
  }
}

let DB_CONNECTION = process.env[argv[databaseUrlVarArg]]

const action = argv._.shift()

const MIGRATIONS_DIR = `${process.cwd()}/migrations`


if (action === 'create') {
  // replaces spaces with dashes - should help fix some errors
  // forces use of dashes in names - keep thing clean
  let newMigrationName = (argv._.length
    ? argv._.join('-')
    : '').replace(/[_ ]+/g, '-')

  if (!newMigrationName) {
    console.error("'migrationName' is required.")
    yargs.showHelp()
    process.exit(1)
  }

  createMigration({
    name: newMigrationName,
    directory: MIGRATIONS_DIR,
  })
    .then((migrationPath) => {
      console.log(util.format('Created migration -- %s', migrationPath))
      process.exit(0)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
} else if (action === 'up' || action === 'down') {
  if (!DB_CONNECTION) {
    throw new Error(`The ${argv[databaseUrlVarArg]} environment variable is not set.`)
  }

  const options = direction => ({
    direction,
    databaseUrl: {
      connectionString: DB_CONNECTION,
    },
  })

  runner(options(action))
    .then(() => {
      console.log('Migrations complete!')
      process.exit(0)
    })
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
} else {
  console.log(argv._)
  console.error('Invalid Action: Must be [up|down|create|redo].')
  yargs.showHelp()
  process.exit(1)
}
