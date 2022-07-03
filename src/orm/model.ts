import type {
  BaseModel,
  FindOptions,
  ID,
  ColumnData,
  Where,
  SQL,
  WhereValues,
  Join,
  Tx,
} from './types'
import { Pool } from 'pg'
import { buildAliasMapper, insertValues, SQLParams } from './queryBuilder'
import { query, queryRow } from './utils'

type Repos = Record<string, ReturnType<typeof createModel>>
const _repos: Repos = {}

export type JoinStrategy<T = Record<string, any>> = {
  table: string
  foreignProp: string
  referenceProp: string
  fn: (options: {
    repos: Repos
    data: T | T[]
    prop: string
    primaryKey: string
    select?: never[]
    join?: Join
    tx?: Tx
  }) => Promise<void>
}

export function createModel<
  D,
  S extends string = '',
>({
  table,
  mapping,
  primaryKey = 'id',
}: {
  table: string
  pool?: Pool
  primaryKey?: string
  mapping: Record<keyof D, ColumnData | JoinStrategy>
}) {
  type T = Omit<D, S>
  type FindParams = FindOptions<T, Tx>

  const allMapping = Object.entries<ColumnData | JoinStrategy>(mapping)

  type Joins = Record<keyof T, JoinStrategy>
  const joins = allMapping.reduce<Joins>((acc, [key, value]) => {
    if (value['foreignProp'] && value['referenceProp']) {
      acc[key] = value
    }

    return acc
  }, {} as Joins)

  type Mapping = Record<keyof T, ColumnData>
  const columnsMapping = allMapping.reduce<Mapping>((acc, [key, value]) => {
    if (value['name'] || typeof value === 'string') {
      acc[key] = value
    }

    return acc
  }, {} as Mapping)

  // constructor
  const aliasMapper = buildAliasMapper<T>(columnsMapping)

  const columnAlias = aliasMapper
  const cols = (...args: Array<keyof T>) => args.map(
    key => {
      const originalColumn = aliasMapper(key)
      const column = `"${key as string}"`

      return originalColumn === column
        ? column
        : `${originalColumn} AS ${column}`
    },
  ).join(', ')

  const allColumns = Object.entries<ColumnData>(columnsMapping).reduce((acc, [key, value]) => {
    if (typeof value === 'object' && value.hidden) {
      return acc
    }

    const originalColumn = aliasMapper(key as keyof T)
    const column = `"${key as string}"`

    const sql = originalColumn === column
      ? column
      : `${originalColumn} AS ${column}`

    return acc
      ? acc += `, ${sql}`
      : sql
  }, '')

  const _whereSQL = ({
    key,
    values,
    _values,
  }: {
    key: string
    values: Where<T>
    _values: WhereValues
  }): string => {
    const alias = aliasMapper(key as keyof T)
    const value = values[key as keyof T]
    let condition: string

    if (typeof value === 'object') {
      const operator = value as SQL

      if (operator.type === 'sql') {
        condition = operator.fn({
          values: _values,
          alias,
        })
      } else {
        throw new Error('Repository: Unknown operator type')
      }
    } else {
      condition = `${alias} = ?`
      _values.push(value as any)
    }

    return condition
  }
  const where = (values: Where<T> | Where<T>[]) => {
    const keys = Object.keys(values)
    const _values: WhereValues = []
    let sql = ''

    if (keys.length === 0) {
      return {
        sql,
        values: _values,
      }
    }

    if (Array.isArray(values)) {
      // With OR operator
      values.forEach((valuesItem, valuesIndex) => {
        let localSql = ''

        for (const key of Object.keys(valuesItem)) {
          const condition = _whereSQL({
            key,
            _values,
            values: valuesItem,
          })

          localSql += localSql === ''
            ? condition
            : ` AND ${condition}`
        }

        sql += values.length !== valuesIndex + 1
          ? `${localSql} OR `
          : localSql
      })
    } else {
      // Without OR operator
      for (const key of keys) {
        const condition = _whereSQL({
          key,
          _values,
          values,
        })

        sql += sql === ''
          ? condition
          : ` AND ${condition}`
      }
    }


    return {
      sql: `WHERE ${sql}`,
      values: _values,
    }
  }
  function orderBy(values: Exclude<FindParams['orderBy'], undefined>) {
    let sql = ''

    for (const key of Object.keys(values)) {
      const alias = aliasMapper(key as keyof T)

      sql += sql !== ''
        ? `, ${alias} ${values[key]}`
        : `${alias} ${values[key]}`
    }

    return sql
  }

  function runJoins(result: T | T[], options: FindOptions<T, Tx>) {
    if (typeof options.join === 'undefined') {
      return
    }

    return Promise.all(options.join.map(async key => {
      if (Array.isArray(key)) {
        const prop = key[0]
        const selectAndSunJoins = key[1] ?? []
        const select = selectAndSunJoins.filter(col => typeof col === 'string')
        const selectJoin = selectAndSunJoins.filter(col => typeof col !== 'string')
        const join = joins[prop]

        await join.fn({
          repos: _repos,
          data: result,
          tx: options.tx,
          select: select.length === 0
            ? undefined
            : [...select, join.referenceProp] as never[],
          join: selectJoin.length === 0
            ? undefined
            : selectJoin as Join,
          prop,
          primaryKey,
        })
      } else if (typeof key === 'string') {
        await joins[key].fn({
          repos: _repos,
          data: result,
          tx: options.tx,
          prop: key,
          primaryKey,
        })
      }
    }))
  }
  // constructor end


  // methods
  async function create(value: Partial<T>, tx?: Tx): Promise<T> {
    const _cols: string[] = []
    const _values: any[] = []

    for (const key of Object.keys(value) as Array<keyof T>) {
      _cols.push(columnAlias(key))
      _values.push(value[key])
    }

    const cols = _cols.join(', ')
    const values = insertValues(_values)

    const row = await queryRow<T>(
      `INSERT INTO "${table}" (${cols}) VALUES (${values}) RETURNING ${allColumns}`,
      _values,
      tx,
    )


    return row
  }

  async function createMany(values: Partial<T>[], tx?: Tx): Promise<T[]> {
    if (values.length === 0) {
      return []
    }

    const _cols: string[] = []
    const _values: any[][] = []

    for (const value of values) {
      const keys = Object.keys(value) as Array<keyof T>

      for (const key of keys) {
        if (_cols.length !== keys.length) _cols.push(columnAlias(key))

        _values.push(value[key] as any)
      }
    }

    const cols = _cols.join(', ')
    const inlinedValues = values
      .map((_, index) => `(${_cols.map((_, cIndex) => {
        const offset = index !== 0
          ? _cols.length * index
          : 0

        return `$${cIndex + 1 + offset}`
      })})`)
      .join(', ')

    const rows = await query<T>(
      `INSERT INTO "${table}" (${cols}) VALUES ${inlinedValues} RETURNING ${allColumns}`,
      _values,
      tx,
    )

    return rows
  }

  function update(id: ID | Where<T>, newValue: Partial<T>, tx?: Tx): Promise<T> {
    const keys = Object.keys(newValue)

    if (keys.length === 0) {
      return findOne(id, { tx })
    }

    const sqlSet = keys.reduce((acc, key) => {
      const sql = `${columnAlias(key as keyof T)} = ?`

      return acc !== ''
        ? `${acc}, ${sql}`
        : sql
    }, '')

    const isPrimitive = typeof id !== 'object'
    // TODO: use always where() call for values
    const values = [] as any[]
    let sql = `UPDATE "${table}" SET ${sqlSet}`

    if (isPrimitive) {
      values.push(id)
      sql += ` WHERE "${primaryKey}" = ?`
    } else {
      values.push(...Object.values(id))
      sql += ` ${where(id).sql}`
    }

    sql += ` RETURNING ${allColumns}`

    return queryRow<T>(SQLParams(sql), [...Object.values(newValue), ...values], tx)
  }

  function del(id: ID | Where<T>, tx?: Tx): Promise<boolean> {
    const isPrimitive = typeof id !== 'object'
    const values = isPrimitive
      ? [id]
      : Object.values(id)

    let sql = `DELETE FROM "${table}"`

    if (isPrimitive) {
      sql += ` WHERE "${primaryKey}" = ?`
    } else {
      sql += ` ${where(id).sql}`
    }

    return queryRow<boolean>(SQLParams(sql), values, tx)
  }

  async function findAll(value: Where<T> | Where<T>[], options: FindParams = {}): Promise<D[]> {
    const isNotEmptySelect = typeof options.select !== 'undefined'

    // maybe need optimization
    if (typeof options.join !== 'undefined') {
      for (const join of options.join) {
        if (isNotEmptySelect) {
          const joinPropName = typeof join === 'string'
            ? join
            : join[0]

          options.select!.push(joins[joinPropName].foreignProp as any)
        }
      }
    }


    const sqlCols = isNotEmptySelect
      ? cols(...options.select!)
      : allColumns
    const whereProps = where(value)

    let sql = `SELECT ${sqlCols} FROM "${table}" ${whereProps.sql}`

    if (typeof options.orderBy !== 'undefined') {
      sql += ` ORDER BY ${orderBy(options.orderBy)}`
    }

    if (typeof options.skip === 'number') {
      sql += ' OFFSET ?'
      whereProps.values.push(options.skip)
    }
    if (typeof options.limit === 'number') {
      sql += ' LIMIT ?'
      whereProps.values.push(options.limit)
    }

    const result = await query<D>(SQLParams(sql), whereProps.values, options.tx)
    if (result.length === 0) {
      return result
    }

    await runJoins(result, options)

    return result
  }

  async function findOne(id: ID | Where<T> | Where<T>[], options: FindParams = {}): Promise<D> {
    const isNotEmptySelect = typeof options.select !== 'undefined'

    // maybe need optimization
    if (typeof options.join !== 'undefined') {
      for (const join of options.join) {
        if (isNotEmptySelect) {
          const joinPropName = typeof join === 'string'
            ? join
            : join[0]

          options.select!.push(joins[joinPropName].foreignProp as any)
        }
      }
    }

    const sqlCols = isNotEmptySelect
      ? cols(...options.select!)
      : allColumns
    const isPrimitive = typeof id !== 'object'

    let sql = `SELECT ${sqlCols} FROM "${table}"`

    if (isPrimitive) {
      sql += ` WHERE "${primaryKey}" = ?`

      if (typeof options.orderBy !== 'undefined') {
        sql += ` ORDER BY ${orderBy(options.orderBy)}`
      }

      const result = await queryRow<D>(SQLParams(sql), [id], options.tx)
      if (typeof result === 'undefined') {
        return result
      }

      await runJoins(result, options)

      return result
    } else {
      const whereProps = where(id)
      sql += ` ${whereProps.sql}`

      if (typeof options.orderBy !== 'undefined') {
        sql += ` ORDER BY ${orderBy(options.orderBy)}`
      }

      const result = await queryRow<D>(SQLParams(sql), whereProps.values, options.tx)
      if (typeof result === 'undefined') {
        return result
      }

      await runJoins(result, options)

      return result
    }
  }

  async function exist(id: ID | Where<T> | Where<T>[], tx?: Tx): Promise<boolean> {
    let sql = `SELECT COUNT(*)::integer as count FROM "${table}"`
    const isPrimitive = typeof id !== 'object'

    if (isPrimitive) {
      sql += ` WHERE "${primaryKey}" = ? LIMIT 1`

      const res = await queryRow<{ count: number }>(SQLParams(sql), [id], tx)
      return res.count !== 0
    } else {
      const whereProps = where(id)
      sql += ` ${whereProps.sql}`

      const res = await queryRow<{ count: number }>(SQLParams(sql), whereProps.values, tx)
      return res.count !== 0
    }
  }

  async function count(value: Where<T> | Where<T>[], tx?: Tx): Promise<number> {
    const whereProps = where(value)
    const sql = `SELECT COUNT(*)::integer as count FROM "${table}" ${whereProps.sql}`

    const res = await queryRow<{ count: number }>(
      SQLParams(sql),
      whereProps.values,
      tx,
    )

    return res.count
  }

  const output = {
    table,
    joins: joins as any,
    primaryKey,
    allColumns,
    columnAlias,
    where,
    runJoins,
    cols,
    ...({
      create,
      createMany,
      update,
      delete: del,
      findAll,
      findOne,
      exists: exist,
      count,
    } as BaseModel<D, T, Tx>),
  }

  // @ts-ignore
  _repos[table] = output

  return output
}
