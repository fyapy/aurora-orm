import type {ModelOptions, AnyObject, Models, Model} from './types.js'
import type {Driver} from './drivers/types.js'

import {subsctibeToConnection, ormConfig} from './connect.js'

const models: Models = {}

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
  mockDriver,
}: ModelOptions<T>): Model<T> {
  let driver = ormConfig.driver!

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
    async findOrFail() {
      console.warn('findOrFail method called before aurora-orm connected')
      return {} as any
    },
    async exists() {
      console.warn('exists method called before aurora-orm connected')
      return false
    },
    async existsOrFail() {
      console.warn('existsOrFail method called before aurora-orm connected')
      return false
    },
    async count() {
      console.warn('count method called before aurora-orm connected')
      return 0
    },

    begin: driver?.begin,
    startTrx: driver?.startTrx,
    commit: driver?.commit,
    rollback: driver?.rollback,
    getDriver: () => driver,
    setDriver,
  } as Model<T>

  models[table] = output


  function setDriver(newDriver: Driver) {
    driver = newDriver

    output.begin = newDriver.begin
    output.startTrx = newDriver.startTrx
    output.commit = newDriver.commit
    output.rollback = newDriver.rollback

    const methods = newDriver.buildModelMethods<T>({
      table,
      mapping,
      primaryKey,
      beforeCreate,
      afterCreate,
      beforeUpdate,
      afterUpdate,
      beforeDelete,
      afterDelete,
      models,
    })

    for (const method in methods) {
      output[method] = methods[method]
    }
  }

  if (typeof mockDriver !== 'undefined') {
    setDriver(mockDriver)
  } else {
    subsctibeToConnection(connectedDriver => {
      if (driver !== null) return false

      setDriver(connectedDriver)

      return true
    })
  }

  return output
}
