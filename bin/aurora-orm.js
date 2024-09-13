#!/usr/bin/env node

'use strict'

import {createMigration} from '../dist/migrator/index.js'

process.on('uncaughtException', err => {
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

if (action === 'create') {
  if (!migrationName) {
    console.error("'migrationName' is required.")
    process.exit(1)
  }

  createMigration({
    name: migrationName,
    directory: `${process.cwd()}/migrations`,
  })
    .then(migrationPath => {
      console.log(`Created migration -- ${migrationPath}`)
      process.exit(0)
    })
    .catch(err => {
      console.error(err)
      process.exit(1)
    })
} else {
  console.error('Invalid Action: Must be [create].')
  process.exit(1)
}
