import type { Pool } from 'pg'
import type {
  BaseModel,
  FindAllOptions,
  FindOneOptions,
  ID,
  ColumnData,
  Where,
  Operator,
  WhereValues,
  Join,
  Tx,
  BaseFindOptions,
  SetOperator,
  Set,
} from './types'
import { buildAliasMapper, insertValues } from './queryBuilder'
import { ormConfig, DefaultConnection, subsctibeToConnection } from './connect'

type Repos = Record<string, ReturnType<typeof createModel>>
const _repos: Repos = {}
const TRUE = true

export type JoinStrategy<T = Record<string, any>> = {
  table: string
  foreignProp: string
  referenceProp: string
  fn(options: {
    repos: Repos
    data: T | T[]
    prop: string
    primaryKey: string
    select?: never[]
    join?: Join
    tx?: Tx
  }): Promise<void>
}

export function createModel<
  D,
  S extends string = '',
>({
  table,
  mapping,
  primaryKey = 'id',
  query,
  queryRow,
  connectionName = DefaultConnection,
  beforeCreate,
  afterCreate,
  beforeUpdate,
  afterUpdate,
  beforeDelete,
  afterDelete,
}: {
  table: string
  pool?: Pool
  primaryKey?: string
  mapping: Record<keyof D, ColumnData | JoinStrategy>
  query?: (connectionName: string) => <T = any>(sql: string, values?: any[] | null, tx?: Tx) => Promise<T[]>
  queryRow?: (connectionName: string) => <T = any>(sql: string, values: any[] | null, tx?: any | undefined) => Promise<T>
  connectionName?: string,
  beforeCreate?: (setData?: Partial<Omit<D, S>>) => Promise<void>,
  afterCreate?: (data: Omit<D, S>) => Promise<void>,
  beforeUpdate?: (set: Set<Omit<D, S>>) => Promise<void>,
  afterUpdate?: (data: Omit<D, S>) => Promise<void>,
  beforeDelete?: (data: ID | Where<Omit<D, S>>) => Promise<void>,
  afterDelete?: (data: ID | Where<Omit<D, S>>, deleted: boolean) => Promise<void>,
}) {
  type T = Omit<D, S>
  type BaseFindParams = BaseFindOptions<T, Tx>
  type FindAllParams = FindAllOptions<T, Tx>
  type FindOneParams = FindOneOptions<T, Tx>

  // database runtime
  const beforeCreateExists = typeof beforeCreate !== 'undefined'
  const afterCreateExists = typeof afterCreate !== 'undefined'
  const beforeUpdateExists = typeof beforeUpdate !== 'undefined'
  const afterUpdateExists = typeof afterUpdate !== 'undefined'
  const beforeDeleteExists = typeof beforeDelete !== 'undefined'
  const afterDeleteExists = typeof afterDelete !== 'undefined'

  let connection = ormConfig.connections[connectionName]!
  let dbQuery = query ? query(connectionName) : connection?.query
  let dbQueryRow = queryRow ? queryRow(connectionName) : connection?.queryRow

  if (process.env.NODE_ENV !== 'test') {
    subsctibeToConnection((name, driver) => {
      if (name !== connectionName || !!connection) return false

      connection = driver
      dbQuery = driver.query
      dbQueryRow = driver.queryRow

      output.connection = driver
      output.getConnect = driver.getConnect
      output.startTrx = driver.startTrx
      output.commit = driver.commit
      output.rollback = driver.rollback

      return true
    })

    setTimeout(() => {
      // TODO: add global timeout handler
      // throw connection timeout error
      if (typeof connection === 'undefined') {
        throw new Error('aurora-orm cannot get connection during 5000 ms, check database connection!')
      }
    }, 5000)
  }


  // columns
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
  const hasWhereColumn = typeof columnsMapping['where'] !== 'undefined'

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

    if (typeof value === 'object') {
      const operator = value as Operator

      if (operator !== null && operator.type === 'operator') {
        return operator.fn({
          values: _values,
          alias,
        })
      } else {
        _values.push(value as any)
        return `${alias} = ?`
      }
    }

    _values.push(value as any)
    return `${alias} = ?`
  }
  function getSetValues(values: Set<T>) {
    const keys = Object.keys(values)
    const _values: WhereValues = []

    for (const key of keys) {
      _whereSQL({ key, _values, values } as any)
    }

    return _values
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
        const condition = _whereSQL({ key, _values, values })

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
  function orderBy(values: Exclude<BaseFindParams['orderBy'], undefined>) {
    let sql = ''

    for (const key of Object.keys(values)) {
      const alias = aliasMapper(key as keyof T)

      sql += sql !== ''
        ? `, ${alias} ${values[key]}`
        : `${alias} ${values[key]}`
    }

    return sql
  }

  function runJoins(result: T | T[], options: BaseFindParams) {
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

    if (beforeCreateExists === TRUE) {
      await beforeCreate!(value)
    }

    const row = await dbQueryRow<T>(
      `INSERT INTO "${table}" (${cols}) VALUES (${values}) RETURNING ${allColumns}`,
      _values,
      tx,
    )

    if (afterCreateExists === TRUE) {
      await afterCreate!(row)
    }

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

    if (beforeCreateExists === TRUE) {
      await Promise.all(values.map(value => beforeCreate!(value)))
    }

    const rows = await dbQuery<T>(
      `INSERT INTO "${table}" (${cols}) VALUES ${inlinedValues} RETURNING ${allColumns}`,
      _values,
      tx,
    )

    if (afterCreateExists === TRUE) {
      await Promise.all(rows.map(row => afterCreate!(row)))
    }

    return rows
  }

  async function update({
    returning = false,
    where: id,
    set,
    tx,
  }: {
    where: ID | Where<T>
    set: Set<T>
    tx?: Tx
    returning?: boolean | Array<keyof T>
  }): Promise<T> {
    const keys = Object.keys(set)

    if (keys.length === 0) {
      return findOne({ where: id, tx })
    }

    const setValues = getSetValues(set)
    const sqlSet = keys.reduce((acc, key, index) => {
      const setValue = set[key] as SetOperator | number | string | boolean | null

      // SetOperator
      if (typeof setValue === 'object' && setValue !== null && setValue.type === 'set-operator') {
        setValues[index] = setValue.value
        const sql = setValue.fn(columnAlias(key as keyof T))

        return acc !== ''
          ? `${acc}, ${sql}`
          : sql
      }

      // Primitive
      const sql = `${columnAlias(key as keyof T)} = ?`

      return acc !== ''
        ? `${acc}, ${sql}`
        : sql
    }, '')

    const isPrimitive = typeof id !== 'object'
    let sql = `UPDATE "${table}" SET ${sqlSet}`
    const returningSQL = returning === false
      ? ''
      : (returning === true
        ? ` RETURNING ${allColumns}`
        : ` RETURNING ${cols(...returning)}`)

    if (isPrimitive) {
      sql += ` WHERE "${primaryKey}" = ?${returningSQL}`

      if (beforeUpdateExists === TRUE) {
        await beforeUpdate!(set)
      }

      const row = await dbQueryRow<T>(sql, [...setValues, id], tx)

      if (afterUpdateExists === TRUE) {
        await afterUpdate!(row)
      }

      return row
    } else {
      const whereProps = where(id)
      sql += ` ${whereProps.sql}${returningSQL}`

      if (beforeUpdateExists === TRUE) {
        await beforeUpdate!(set)
      }

      const row = await dbQueryRow<T>(sql, [...setValues, ...whereProps.values], tx)

      if (afterUpdateExists === TRUE) {
        await afterUpdate!(row)
      }

      return row
    }
  }

  async function del(id: ID | Where<T>, tx?: Tx): Promise<boolean> {
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

    if (beforeDeleteExists === TRUE) {
      await beforeDelete!(id)
    }

    const res = await dbQueryRow(sql, values, tx)
    const deleted = (res as any).rowCount !== 0

    if (afterDeleteExists === TRUE) {
      await afterDelete!(id, deleted)
    }

    return deleted
  }

  function isWhere(params: any): params is Where<T> | Where<T>[] {
    if (hasWhereColumn === true && typeof params.where !== 'undefined') {
      return typeof params.where !== 'object'
        ? true
        : params.where.type === 'operator' // is operator
    }

    return Array.isArray(params) || typeof params.where === 'undefined'
  }

  function prepareSelectColumns(params: FindOneParams) {
    const isNotEmptySelect = typeof params.select !== 'undefined'

    if (typeof params.join !== 'undefined') {
      for (const join of params.join) {
        if (isNotEmptySelect) {
          const joinPropName = typeof join === 'string'
            ? join
            : join[0]

          params.select!.push(joins[joinPropName].foreignProp as any)
        }
      }
    }

    const sqlCols = isNotEmptySelect
      ? cols(...params.select!)
      : allColumns

    return sqlCols
  }

  async function findAll(params: Where<T> | Where<T>[] | FindAllParams = {}): Promise<D[]> {
    if (isWhere(params)) {
      // not without FindParams
      const whereProps = where(params)
      const sql = `SELECT ${allColumns} FROM "${table}" ${whereProps.sql}`

      const result = await dbQuery<D>(sql, whereProps.values)
      return result
    }

    // FindParams
    const sqlCols = prepareSelectColumns(params)
    const whereProps = where(params.where)

    let sql = `SELECT ${sqlCols} FROM "${table}" ${whereProps.sql}`

    if (typeof params.orderBy !== 'undefined') {
      sql += ` ORDER BY ${orderBy(params.orderBy)}`
    }

    if (typeof params.skip === 'number') {
      sql += ' OFFSET ?'
      whereProps.values.push(params.skip)
    }
    if (typeof params.limit === 'number') {
      sql += ' LIMIT ?'
      whereProps.values.push(params.limit)
    }

    const result = await dbQuery<D>(sql, whereProps.values, params.tx)
    if (result.length === 0) {
      return result
    }

    await runJoins(result, params)

    return result
  }

  async function findOneByParams(params: FindOneParams): Promise<D> {
    const sqlCols = prepareSelectColumns(params)
    let sql = `SELECT ${sqlCols} FROM "${table}"`


    if (typeof params.where !== 'object') {
      sql += ` WHERE "${primaryKey}" = ?`

      if (typeof params.orderBy !== 'undefined') {
        sql += ` ORDER BY ${orderBy(params.orderBy)}`
      }

      return await dbQueryRow<D>(sql, [params.where], params.tx)
    } else {
      const whereProps = where(params.where)
      sql += ` ${whereProps.sql}`

      if (typeof params.orderBy !== 'undefined') {
        sql += ` ORDER BY ${orderBy(params.orderBy)}`
      }

      return await dbQueryRow<D>(sql, whereProps.values, params.tx)
    }
  }

  async function findOne(params: ID | Where<T> | Where<T>[] | FindOneParams): Promise<D> {
    if (typeof params !== 'object') {
      // isPrimitive
      const sql = `SELECT ${allColumns} FROM "${table}" WHERE "${primaryKey}" = ?`

      return await dbQueryRow<D>(sql, [params])
    }

    if (isWhere(params)) {
      // just Where
      const whereProps = where(params)
      const sql = `SELECT ${allColumns} FROM "${table}" ${whereProps.sql}`

      return await dbQueryRow<D>(sql, whereProps.values)
    }

    // FindParams
    const result = await findOneByParams(params)
    if (typeof result === 'undefined') {
      return result
    }

    await runJoins(result, params)

    return result
  }

  async function exist(id: ID | Where<T> | Where<T>[], tx?: Tx): Promise<boolean> {
    let sql = `SELECT COUNT(*)::integer as count FROM "${table}"`
    const isPrimitive = typeof id !== 'object'

    if (isPrimitive) {
      sql += ` WHERE "${primaryKey}" = ? LIMIT 1`

      const res = await dbQueryRow<{ count: number }>(sql, [id], tx)
      return res.count !== 0
    } else {
      const whereProps = where(id)
      sql += ` ${whereProps.sql}`

      const res = await dbQueryRow<{ count: number }>(sql, whereProps.values, tx)
      return res.count !== 0
    }
  }

  async function count(value: Where<T> | Where<T>[], tx?: Tx): Promise<number> {
    const whereProps = where(value)
    const sql = `SELECT COUNT(*)::integer as count FROM "${table}" ${whereProps.sql}`

    const res = await dbQueryRow<{ count: number }>(sql, whereProps.values, tx)

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

    connection,
    getConnect: connection?.getConnect,
    startTrx: connection?.startTrx,
    commit: connection?.commit,
    rollback: connection?.rollback,
  }

  // @ts-ignore
  _repos[table] = output

  return output
}
