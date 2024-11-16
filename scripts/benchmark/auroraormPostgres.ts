import {createModel, disconnect, connect, Drivers} from '../../src/index.js'
import {connectionString, idleTimeout, iter} from './constants.js'
import {downMigrations, upMigrations} from './migrator.js'
import {formatResult, readJSON, bench} from '../utils.js'
import {User} from './data.js'

const users = readJSON<User[]>('./scripts/benchmark/data/users.json')

const UserRepo = createModel<User>({
  table: 'users',
  mapping: {
    id: 'id',
    username: 'username',
    email: 'email',
    type: 'type',
    active: 'active',
    createdAt: 'created_at',
  },
})

async function benchAuroraORM() {
  await upMigrations()
  await connect({
    connectNotify: false,
    config: {
      driver: Drivers.Postgres,
      connectionString,
      ...({max: 4, idle_timeout: idleTimeout / 1000} as any),
    },
  })

  try {
    const insert = await bench(iter.insert, () => {
      const u = users.pop()!

      return UserRepo.create(u)
    })

    const select = await bench(iter.select, () => UserRepo.findAll({where: {}, limit: 10}))

    return {insert, select}
  } catch (e) {
    throw e
  } finally {
    await downMigrations()
    await disconnect()
  }
}

export default async function benchAndFormat() {
  const name = 'aurora-orm (postgres)'
  const result = await benchAuroraORM()
  formatResult(name, result)
  return {name, ...result}
}
