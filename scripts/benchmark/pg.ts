import pg from 'pg'

import {connectionString, idleTimeout, iter} from './constants.js'
import {downMigrations, upMigrations} from './migrator.js'
import {formatResult, readJSON, bench} from '../utils.js'
import {User} from './data.js'

const users = readJSON<User[]>('./scripts/benchmark/data/users.json')

export async function benchPG() {
  await upMigrations()
  const pool = new pg.Pool({connectionString, max: 4, idleTimeoutMillis: idleTimeout})

  try {
    const insert = await bench(iter.insert, () => {
      const u = users.pop()!

      return pool.query(
        'INSERT INTO users (id, username, email, type, active, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [u.id, u.username, u.email, u.type, u.active, u.createdAt],
      )
    })

    const select = await bench(iter.select, () => pool.query('SELECT * FROM users LIMIT 10'))

    return {insert, select}
  } catch (e) {
    throw e
  } finally {
    await pool.end()
    await downMigrations()
  }
}

export default async function benchAndFormat() {
  const name = 'pg'
  const result = await benchPG()
  formatResult(name, result)
  return {name, ...result}
}
