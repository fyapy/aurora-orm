#!/usr/bin/env node

'use strict'

const process = require('node:process')
const { createMigration, runner } = require('../dist/migrator')
const { loadConnectionConfig } = require('../dist/connection')

process.on('uncaughtException', (err) => {
  console.error(err)
  process.exit(1)
})

function parseArgv(argv) {
  const action = argv.pop()
  if (action === 'up' || action === 'down') {
    return {action}
  }

  const secondAction = argv.pop()
  if (secondAction === 'create') {
    return {action: secondAction, migrationName: action}
  }

  return {}
}

const {action, migrationName} = parseArgv(process.argv)

const MIGRATIONS_DIR = `${process.cwd()}/migrations`

if (action === 'create') {
  if (!migrationName) {
    console.error("'migrationName' is required.")
    process.exit(1)
  }

  createMigration({
    name: migrationName,
    directory: MIGRATIONS_DIR,
  })
    .then(migrationPath => {
      console.log(`Created migration -- ${migrationPath}`)
      process.exit(0)
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
} else if (action === 'up' || action === 'down') {
  const config = loadConnectionConfig()

  runner({
    direction: action,
    config,
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
  console.error('Invalid Action: Must be [up|down|create].')
  process.exit(1)
}
