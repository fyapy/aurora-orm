import postgres from 'postgres'

import {connectionString, idleTimeout, iter} from './constants.js'
import {downMigrations, upMigrations} from './migrator.js'
import {formatResult, readJSON, bench} from '../utils.js'
import {User} from './data.js'

const users = readJSON<User[]>('./scripts/benchmark/data/users.json')

export async function benchPostgres() {
  await upMigrations()
  const sql = postgres(connectionString, {max: 4, idle_timeout: idleTimeout / 1000})

  try {
    const insert = await bench(iter.insert, () => {
      const u = users.pop()!

      return sql.unsafe(
        'INSERT INTO users (id, username, email, type, active, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [u.id, u.username, u.email, u.type, u.active, u.createdAt],
      )
    })

    const select = await bench(iter.select, () => sql.unsafe('SELECT * FROM users LIMIT 10'))

    return {insert, select}
  } catch (e) {
    throw e
  } finally {
    await sql.end({timeout: 0})
    await downMigrations()
  }
}

export default async function benchAndFormat() {
  const result = await benchPostgres()
  formatResult('postgres', result)
}
