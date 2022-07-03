import type { Tx } from './types'
import { config } from './connect'
import { createModel } from './model'

export const isUniqueErr = (error: any, table?: string) => {
  if (table) {
    return error.code === '23505' && error.severity === 'ERROR' && error.table === table
  }

  return error.code === '23505' && error.severity === 'ERROR'
}

export const getConnect = (tx?: Tx): Promise<Tx> => {
  if (tx) {
    return tx as unknown as Promise<Tx>
  }
  return config.pool!.connect()
}

export const queryRow = async <T = any>(sql: string, values: any[] | null, tx?: Tx): Promise<T> => {
  const client = await getConnect(tx)
  if (config.debug === true) {
    console.log(sql, values)
  }

  if (Array.isArray(values)) {
    try {
      const res = await client.query(sql, values)

      return (res.command === 'DELETE'
        ? res.rowCount !== 0
        : res.rows[0]) as T
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      if (!tx) client.release()
    }
  }

  try {
    const res = await client.query(sql)

    return res.rows[0] as T
  } catch (e) {
    throw e
  } finally {
    if (!tx) client.release()
  }
}
export const query = async <T = any>(sql: string, values?: any[] | null, tx?: Tx) => {
  const client = await getConnect(tx)
  if (config.debug === true) {
    console.log(sql, values)
  }

  if (Array.isArray(values)) {
    try {
      const res = await client.query(sql, values)

      return res.rows as T[]
    } catch (e) {
      throw e
    } finally {
      if (!tx) client.release()
    }
  }

  try {
    const res = await client.query(sql)

    return res.rows as T[]
  } catch (e) {
    throw e
  } finally {
    if (!tx) client.release()
  }
}

export const startTrx = async (tx?: Tx) => {
  const _tx = tx ?? await getConnect()
  await _tx.query('BEGIN')
  return _tx
}
export const commit = async (tx: Tx, closeConnection = true) => {
  await tx.query('COMMIT')
  if (closeConnection === true) {
    tx.release()
  }
}
export const rollback = async (tx: Tx, closeConnection = true) => {
  await tx.query('ROLLBACK')
  if (closeConnection === true) {
    tx.release()
  }
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
