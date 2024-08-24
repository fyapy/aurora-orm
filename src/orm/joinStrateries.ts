import type { JoinStrategy } from './types'
import { In } from './operators'
import { makeUnique, mapper, manyMapper } from './utils'

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
      const foreighModel = models[table]

      if (Array.isArray(data)) {
        const values = makeUnique(data.map(d => d[referenceProp])).filter(d => d !== null)

        const foreignList = await foreighModel.findAll({
          where: {
            [foreignProp]: In(values),
          },
          select,
          join,
          tx,
        })

        mapper(prop, data, referenceProp, foreignList, foreignProp)
      } else {
        // only findOne join optimization
        const where = foreighModel.primaryKey === referenceProp
          ? data[foreignProp]
          : { [foreignProp]: data[referenceProp] }

        const foreignData = await foreighModel.findOne({
          where,
          select,
          join,
          tx,
        })

        if (referenceProp !== primaryKey) {
          delete data[referenceProp]
        }

        data[prop] = foreignData
      }
    },
  }
}

export function OneToMany({
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
    async fn({ data, models, select, tx, join, prop, primaryKey }) {
      const foreighModel = models[table]

      if (Array.isArray(data)) {
        const foreignList = await foreighModel.findAll({
          where: {
            [foreignProp]: In(makeUnique(data.map(d => d[referenceProp]))),
          },
          select,
          join,
          tx,
        })

        manyMapper(prop, data, referenceProp, foreignList, foreignProp)
      } else {
        const where = { [foreignProp]: data[referenceProp] }

        const foreighData = await foreighModel.findAll({
          where,
          select,
          join,
          tx,
        })

        if (referenceProp !== primaryKey) {
          delete data[referenceProp]
        }

        data[prop] = foreighData
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
      const foreighModel = models[table]

      if (Array.isArray(data)) {
        const where = primaryKey === referenceProp
          ? In(makeUnique(data.map(d => d[foreignProp])))
          : { [referenceProp]: In(makeUnique(data.map(d => d[foreignProp]))) }

        const foreignList = await foreighModel.findAll({ where, tx })

        // custom mapper
        const mapper = {}
        foreignList.forEach((c: any) => mapper[c[referenceProp]] = true)

        for (const item of data) {
          item[prop] = mapper[item[foreignProp]] ?? false
        }
      } else {
        const where = { [foreignProp]: data[referenceProp] }

        const foreighData = await foreighModel.exists(where, tx)

        if (foreignProp !== primaryKey) {
          delete data[foreignProp]
        }

        data[prop] = foreighData
      }
    },
  }
}
