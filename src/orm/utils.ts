import type { createModel } from './model'

export const isUniqueErr = (error: any, table?: string) => {
  if (table) {
    return error.code === '23505' && error.severity === 'ERROR' && error.table === table
  }

  return error.code === '23505' && error.severity === 'ERROR'
}

export const mapper = (
  list: Record<string, any>[],
  mapToProp: string,
  listMapByProp: string,
  map: Record<string, any>[],
  mapByProp: string,
) => {
  const mapper = {}
  map.forEach(c => mapper[c[mapByProp]] = c)

  const deleteForeight = listMapByProp !== 'id'


  for (const item of list) {
    item[mapToProp] = mapper[item[listMapByProp]] ?? null

    if (deleteForeight) {
      delete item[listMapByProp]
    }
  }
}

export const joinStrategyWhere = (
  repo: ReturnType<typeof createModel>,
  data: any,
  foreignProp: string,
  referenceProp: string,
) => repo.primaryKey === referenceProp
  ? data[foreignProp]
  : { [referenceProp]: data[foreignProp] }

export const makeUnique = (list: string[]) => [...new Set(list)]

export const addMethods = <
  T,
  M extends Record<string, (...args: any) => any>
>(
  base: T,
  methods: (base: T) => M,
): T & M => ({
  ...base,
  ...methods(base),
})
