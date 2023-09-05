import type { JoinStrategy } from './types'
import { In } from './operators'
import { makeUnique, mapper, manyMapper, joinStrategyWhere } from './utils'

export function OneToOne({
  table,
  foreignProp,
  referenceProp = 'id',
}: {
  table: string
  foreignProp: string
  referenceProp?: string
}): JoinStrategy<any> {
  return {
    table,
    foreignProp,
    referenceProp,
    async fn({ data, models, select, join, tx, prop, primaryKey }) {
      const joinModel = models[table]

      if (Array.isArray(data)) {
        const values = makeUnique(data.map(d => d[foreignProp])).filter(d => d !== null)

        const dataToJoin = await joinModel.findAll({
          where: {
            [referenceProp]: In(values),
          },
          select,
          join,
          tx,
        })

        mapper(data, prop, foreignProp, dataToJoin as any[], referenceProp)
      } else {
        const where = joinStrategyWhere(joinModel, data, foreignProp, referenceProp)

        const _joinData = await joinModel.findOne({
          where,
          select,
          join,
          tx,
        })

        if (foreignProp !== primaryKey) {
          delete data[foreignProp]
        }

        data[prop] = _joinData
      }
    },
  }
}

export function OneToMany({
  table,
  foreignProp = 'id',
  referenceProp,
}: {
  table: string
  foreignProp?: string
  referenceProp: string
}): JoinStrategy<any> {
  return {
    table,
    foreignProp,
    referenceProp,
    async fn({ data, models, select, tx, join, prop, primaryKey }) {
      const joinModel = models[table]

      if (Array.isArray(data)) {
        const dataToJoin = await joinModel.findAll({
          where: {
            [referenceProp]: In(makeUnique(data.map(d => d[foreignProp]))),
          },
          select,
          join,
          tx,
        })

        manyMapper(data, prop, foreignProp, dataToJoin as any[], referenceProp)
      } else {
        const where = joinStrategyWhere(joinModel, data, foreignProp, referenceProp)
        const _joinData = await joinModel.findAll({
          where,
          select,
          join,
          tx,
        })

        if (foreignProp !== primaryKey) {
          delete data[foreignProp]
        }

        data[prop] = _joinData
      }
    },
  }
}

export function Exists({
  table,
  foreignProp,
  referenceProp = 'id',
}: {
  table: string
  foreignProp: string
  referenceProp?: string
}): JoinStrategy<any> {
  return {
    table,
    foreignProp,
    referenceProp,
    async fn({ data, models, tx, prop, primaryKey }) {
      const joinModel = models[table]

      if (Array.isArray(data)) {
        const where = primaryKey === referenceProp
          ? In(makeUnique(data.map(d => d[foreignProp])))
          : { [referenceProp]: In(makeUnique(data.map(d => d[foreignProp]))) }

        const dataToJoin = await joinModel.findAll({ where, tx })

        // custom mapper
        const mapper = {}
        dataToJoin.forEach((c: any) => mapper[c[referenceProp]] = true)

        for (const item of data) {
          item[prop] = mapper[item[foreignProp]] ?? false
        }
      } else {
        const where = joinStrategyWhere(joinModel, data, foreignProp, referenceProp)
        const _joinData = await joinModel.exists(where, tx)

        if (foreignProp !== primaryKey) {
          delete data[foreignProp]
        }

        data[prop] = _joinData
      }
    },
  }
}
