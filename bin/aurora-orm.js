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

const { argv } = yargs.usage('Usage: $0 [up|down|create] [migrationName]')
  .option(envPathArg, {
    describe: 'Path to the .env file that should be used for configuration',
    type: 'string',
  })


const envPath = argv[envPathArg]
// Load config from ".env" file
loadEnv(envPath)


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
  runner({
    direction,
    databaseUrl: loadConnectionConfig(),
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
