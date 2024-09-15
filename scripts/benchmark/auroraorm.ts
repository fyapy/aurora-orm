import {connectionString, idleTimeout, iter} from './constants.js'
import {createModel, connect, Drivers} from '../../src/index.js'
import {downMigrations, upMigrations} from './migrator.js'
import {formatResult, readJSON,bench} from '../utils.js'
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
      driver: Drivers.PG,
      connectionString,
      ...({max: 4, idleTimeoutMillis: idleTimeout} as any),
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
  }
}

export default async function benchAndFormat() {
  const result = await benchAuroraORM()
  formatResult('aurora-orm (pg)', result)
}
