#!/usr/bin/env node

'use strict'

const yargs = require('yargs')

// process.on('uncaughtException', (err) => {
//   console.error(err)
//   process.exit(1)
// })

// function tryRequire(moduleName) {
//   try {
//     return require(moduleName)
//   } catch (err) {
//     if (err.code !== 'MODULE_NOT_FOUND') {
//       throw err
//     }
//     return null
//   }
// }

const { argv } = yargs.usage('Usage: $0 [up|down|create] [migrationName]')

const action = argv._.shift()

if (action === 'create') {
  console.log('create')
} else if (action === 'up' || action === 'down') {

} else {
  console.log(argv._)
  console.error('Invalid Action: Must be [up|down|create|redo].')
  yargs.showHelp()
  process.exit(1)
}
