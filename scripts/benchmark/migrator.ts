import path from 'node:path'

import {runMigrationsSilent, Drivers} from '../../src/index.js'
import {connectionString} from './constants.js'

const directory = path.join(process.cwd(), 'scripts', 'benchmark', 'migrations')

const logger = () => {}

export const upMigrations = () => runMigrationsSilent({
  config: {driver: Drivers.PG, connectionString},
  direction: 'up',
  directory,
  logger,
})

export const downMigrations = () => runMigrationsSilent({
  config: {driver: Drivers.PG, connectionString},
  direction: 'down',
  directory,
  logger,
})
