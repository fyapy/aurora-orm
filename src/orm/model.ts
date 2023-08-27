import type {ModelOptions, BaseModel, AnyObject, Repos} from './types'
import { ormConfig, subsctibeToConnection } from './connect'

const repos: Repos = {}

export function createModel<T extends AnyObject>({
  table,
  mapping,
  primaryKey = 'id',
  beforeCreate,
  afterCreate,
  beforeUpdate,
  afterUpdate,
  beforeDelete,
  afterDelete,
}: ModelOptions<T>): BaseModel<T> {
  let driver = ormConfig.driver!

  if (process.env.NODE_ENV !== 'test') {
    subsctibeToConnection(connectedDriver => {
      if (driver !== null) return false

      driver = connectedDriver

      output.startTrx = connectedDriver.startTrx
      output.commit = connectedDriver.commit
      output.rollback = connectedDriver.rollback

      const methods = connectedDriver.buildModelMethods<T>({
        table,
        mapping,
        primaryKey,
        beforeCreate,
        afterCreate,
        beforeUpdate,
        afterUpdate,
        beforeDelete,
        afterDelete,
        repos,
      })

      for (const method in methods) {
        output[method] = methods[method]
      }

      return true
    })
  }

  const output = {
    primaryKey,

    async create() {
      console.warn('create method called before aurora-orm connected')
      return {} as any
    },
    async createMany() {
      console.warn('createMany method called before aurora-orm connected')
      return [] as any[]
    },
    async update() {
      console.warn('update method called before aurora-orm connected')
      return {} as any
    },
    async delete() {
      console.warn('delete method called before aurora-orm connected')
      return {} as any
    },
    async findAll() {
      console.warn('findAll method called before aurora-orm connected')
      return [] as any[]
    },
    async findOne() {
      console.warn('findOne method called before aurora-orm connected')
      return {} as any
    },
    async exists() {
      console.warn('exists method called before aurora-orm connected')
      return false
    },
    async count() {
      console.warn('count method called before aurora-orm connected')
      return 0
    },

    startTrx: driver?.startTrx,
    commit: driver?.commit,
    rollback: driver?.rollback,
  } as BaseModel<T>

  repos[table] = output

  return output
}
