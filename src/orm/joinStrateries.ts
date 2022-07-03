import type { JoinStrategy } from './model'
import { In } from './queryBuilder'
import { makeUnique, mapper, joinStrategyWhere } from './utils'

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
    async fn({ data, repos, select, join, tx, prop, primaryKey }) {
      const joinRepo = repos[table]

      if (Array.isArray(data)) {
        const values = makeUnique(data.map(d => d[foreignProp])).filter(d => d !== null)

        const dataToJoin = await joinRepo.findAll({
          [referenceProp]: In(values),
        }, {
          select,
          join,
          tx,
        })

        mapper(data, prop, foreignProp, dataToJoin as any[], referenceProp)
      } else {
        const where = joinStrategyWhere(joinRepo, data, foreignProp, referenceProp)

        const _joinData = await joinRepo.findOne(where, {
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
    async fn({ data, repos, select, tx, join, prop, primaryKey }) {
      const joinRepo = repos[table]

      if (Array.isArray(data)) {
        const dataToJoin = await joinRepo.findAll({
          [foreignProp]: In(makeUnique(data.map(d => d[foreignProp]))),
        }, {
          select,
          join,
          tx,
        })

        mapper(data, prop, foreignProp, dataToJoin as any[], referenceProp)
      } else {
        const where = joinStrategyWhere(joinRepo, data, foreignProp, referenceProp)
        const _joinData = await joinRepo.findAll(where, {
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
    async fn({ data, repos, tx, prop, primaryKey }) {
      const joinRepo = repos[table]

      if (Array.isArray(data)) {
        const where = primaryKey === referenceProp
          ? In(makeUnique(data.map(d => d[foreignProp])))
          : { [referenceProp]: In(makeUnique(data.map(d => d[foreignProp]))) }

        const dataToJoin = await joinRepo.findAll(where, { tx })

        // cusmtom mapper
        const mapper = {}
        dataToJoin.forEach((c: any) => mapper[c[referenceProp]] = true)

        for (const item of data) {
          item[prop] = mapper[item[foreignProp]] ?? false
        }
      } else {
        const where = joinStrategyWhere(joinRepo, data, foreignProp, referenceProp)
        const _joinData = await joinRepo.exists(where, tx)

        if (foreignProp !== primaryKey) {
          delete data[foreignProp]
        }

        data[prop] = _joinData
      }
    },
  }
}
