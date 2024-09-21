import {PrimaryColumn, BaseEntity, DataSource, Entity, Column} from 'typeorm'

import {connectionString, idleTimeout, iter} from './constants.js'
import {downMigrations, upMigrations} from './migrator.js'
import {formatResult, readJSON, bench} from '../utils.js'
import {UserType, User} from './data.js'

const users = readJSON<User[]>('./scripts/benchmark/data/users.json')

export async function benchTypeORM() {
  await upMigrations()

  @Entity({name: 'users'})
  class UserEntity extends BaseEntity {
    @PrimaryColumn({name: 'id', type: 'uuid'}) id!: string
    @Column({name: 'username', type: 'varchar'}) username!: string
    @Column({name: 'email', type: 'varchar'}) email!: string
    @Column({name: 'type', type: 'smallint'}) type!: UserType
    @Column({name: 'active', type: 'bool'}) active!: boolean
    @Column({name: 'created_at', type: 'timestamptz'}) createdAt!: string
  }

  const source = await new DataSource({
    url: connectionString,
    synchronize: false,
    logging: false,
    poolSize: 4,
    type: 'postgres',
    entities: [UserEntity],
    connectTimeoutMS: idleTimeout,
  }).initialize()


  try {
    const insert = await bench(iter.insert, () => {
      const u = users.pop()!

      const entity = new UserEntity()
      entity.id = u.id
      entity.username = u.username
      entity.email = u.email
      entity.type = u.type
      entity.active = u.active
      entity.createdAt = u.createdAt
      return entity.save()
    })

    const select = await bench(iter.select, () => UserEntity.find({take: 10}))

    return {insert, select}
  } catch (e) {
    throw e
  } finally {
    await source.destroy()
    await downMigrations()
  }
}

export default async function benchAndFormat() {
  const name = 'typeorm (pg)'
  const result = await benchTypeORM()
  formatResult(name, result)
  return {name, ...result}
}
