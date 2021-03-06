#!/usr/bin/env node

'use strict'

const util = require('node:util')
const yargs = require('yargs')
const { createMigration, runner } = require('../dist/migrator')
const { loadConnectionConfig } = require('../dist/connection')
const { loadEnv } = require('../dist/utils/env')

process.on('uncaughtException', (err) => {
  console.error(err)
  process.exit(1)
})

const envPathArg = 'envPath'
const migratinsDbConnectionNameArg = 'migratinsDbConnectionName'

const { argv } = yargs.usage('Usage: $0 [up|down|create] [migrationName]')
  .option(envPathArg, {
    describe: 'Path to the .env file that should be used for configuration',
    type: 'string',
  })
  .option(migratinsDbConnectionNameArg, {
    describe: 'When you use multiple-databases specify connectionName to store migrations data',
    type: 'string',
  })


const envPath = argv[envPathArg]
const migratinsDbConnectionName = argv[migratinsDbConnectionNameArg]
// Load config from ".env" file
loadEnv(envPath)


const action = argv._.shift()

const MIGRATIONS_DIR = `${process.cwd()}/migrations`

function _migrationsConfig() {
  const config = loadConnectionConfig()

  if (Array.isArray(config)) {
    if (!migratinsDbConnectionName) {
      throw new Error(`Please specify arg '${migratinsDbConnectionNameArg}', it is needed to specify database where aurora-orm will be store data about migrations`)
    }

    const singleConfig = config.find(c => c.name === migratinsDbConnectionName)
    if (!singleConfig) {
      throw new Error(`Connection name '${migratinsDbConnectionName}' from arg '${migratinsDbConnectionNameArg}' not found!`)
    }
  }

  return config
}

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
  runner({
    direction,
    config: _migrationsConfig(),
  })
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
  console.error('Invalid Action: Must be [up|down|create].')
  yargs.showHelp()
  process.exit(1)
}
