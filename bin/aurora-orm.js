#!/usr/bin/env node

'use strict'

import path from 'node:path'

import {createMigrationFile} from '../index'

process.on('uncaughtException', e => {
  console.error(e)
  process.exit(1)
})

function parseArgv(argv) {
  const migrationName = argv.pop()
  const action = argv.pop()

  return action === 'create'
    ? {action, migrationName}
    : {}
}

const {action, migrationName} = parseArgv(process.argv)

if (action === 'create') {
  if (!migrationName) {
    console.error('\'migrationName\' is required.')
    process.exit(1)
  }

  try {
    const migrationPath = createMigrationFile({
      directory: path.join(process.cwd(), '/migrations'),
      name: migrationName,
    })

    console.log(`Created migration - ${migrationPath}`)
    process.exit(0)
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
} else {
  console.error('Invalid Action: Must be [create].')
  process.exit(1)
}
