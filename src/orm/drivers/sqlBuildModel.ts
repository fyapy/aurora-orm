import {BaseFindOptions, FindAllOptions, FindOneOptions, JoinStrategy, SetOperator, WhereValues, ColumnData, AnyObject, Operator, Where, Join, ID, Tx} from '../types.js'
import {whereOperators, setOperators} from './sqlOperators.js'
import {tableNameToModelName, AuroraFail} from '../utils.js'
import {buildAliasMapper, insertValues} from './sqlUtils.js'
import {whereOperator, setOperator} from '../operators.js'
import {Driver} from './types.js'

export function buildModel(query: Driver['query']) {
  const TRUE = true
  const FALSE = false

  return function<T extends AnyObject>({
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
  }) {
    type BaseFindParams = BaseFindOptions<T>
    type FindAllParams = FindAllOptions<T>
    type FindOneParams = FindOneOptions<T>

    const beforeCreateExists = typeof beforeCreate !== 'undefined'
    const afterCreateExists = typeof afterCreate !== 'undefined'
    const beforeUpdateExists = typeof beforeUpdate !== 'undefined'
    const afterUpdateExists = typeof afterUpdate !== 'undefined'
    const beforeDeleteExists = typeof beforeDelete !== 'undefined'
    const afterDeleteExists = typeof afterDelete !== 'undefined'

    // columns
    const allMapping = Object.entries<JoinStrategy | ColumnData>(mapping)

    type Joins = Record<keyof T, JoinStrategy>
    const joins = (allMapping as Array<[keyof T, JoinStrategy]>).reduce<Joins>((acc, [key, value]) => {
      if (value['foreignProp'] && value['referenceProp']) {
        acc[key] = value
      }

      return acc
    }, {} as Joins)

    type Mapping = Record<keyof T, ColumnData>
    const columnsMapping = (allMapping as Array<[keyof T, ColumnData]>).reduce<Mapping>((acc, [key, value]) => {
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

        if (operator !== null && operator.type === whereOperator) {
          const op = whereOperators[operator.name]

          return op(operator.value, {values: _values, alias})
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
        _whereSQL({key, _values, values} as any)
      }

      return _values
    }
    const where = (values: Where<T>[] | Where<T>) => {
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
          const condition = _whereSQL({key, _values, values})

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

    function runJoins(result: T[] | T, options: BaseFindParams) {
      return Promise.all(options.join!.map(async key => {
        if (Array.isArray(key)) {
          const prop = key[0]
          const selectAndSunJoins = key[1] ?? []
          const select = selectAndSunJoins.filter(col => typeof col === 'string')
          const selectJoin = selectAndSunJoins.filter(col => typeof col !== 'string')
          const join = joins[prop]

          await join.fn({
            models,
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
            models,
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

      const row = (await query<T>(
        `INSERT INTO "${table}" (${cols}) VALUES (${values}) RETURNING ${allColumns}`,
        _values,
        tx,
      ))[0]

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

      const rows = await query<T>(
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
      where: Where<T> | ID
      set: Set<T>
      tx?: Tx
      returning?: Array<keyof T> | boolean
    }): Promise<T> {
      const keys = Object.keys(set)

      if (keys.length === 0) {
        return findOne({where: id, tx})
      }

      const setValues = getSetValues(set)
      const sqlSet = keys.reduce((acc, key, index) => {
        const setValue = set[key] as SetOperator | boolean | number | string | null

        // SetOperator
        if (typeof setValue === 'object' && setValue !== null && setValue.type === setOperator) {
          setValues[index] = setValue.value
          const operator = setOperators[setValue.name]
          const sql = operator(columnAlias(key as keyof T))

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

      let sql = `UPDATE "${table}" SET ${sqlSet}`
      const returningSQL = returning === false
        ? ''
        : (returning === true
          ? ` RETURNING ${allColumns}`
          : ` RETURNING ${cols(...returning)}`)

      if (typeof id !== 'object') {
        sql += ` WHERE "${primaryKey}" = ?${returningSQL}`

        if (beforeUpdateExists === TRUE) {
          await beforeUpdate!(set)
        }

        const row = (await query<T>(sql, [...setValues, id], tx))[0]

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

        const row = (await query<T>(sql, [...setValues, ...whereProps.values], tx))[0]

        if (afterUpdateExists === TRUE) {
          await afterUpdate!(row)
        }

        return row
      }
    }

    async function del(id: Where<T> | ID, tx?: Tx): Promise<void> {
      if (typeof id !== 'object') {
        const sql = `DELETE FROM "${table}" WHERE "${primaryKey}" = ?`

        if (beforeDeleteExists === TRUE) {
          await beforeDelete!(id)
        }

        await query(sql, [id], tx)

        if (afterDeleteExists === TRUE) {
          await afterDelete!(id)
        }
      }

      const whereProps = where(id as Where<T>)
      const sql = `DELETE FROM "${table}" ${whereProps.sql}`

      if (beforeDeleteExists === TRUE) {
        await beforeDelete!(id)
      }

      await query(sql, whereProps.values, tx)

      if (afterDeleteExists === TRUE) {
        await afterDelete!(id)
      }
    }

    function isWhere(params: any): params is Where<T>[] | Where<T> {
      if (hasWhereColumn === true && typeof params.where !== 'undefined') {
        return typeof params.where !== 'object'
          ? true
          : params.where.type === 'operator' // is operator
      }

      return Array.isArray(params) || typeof params.where === 'undefined'
    }

    function prepareSelectColumns(params: FindOneParams) {
      if (typeof params.select === 'undefined') {
        return allColumns
      }
      if (typeof params.join === 'undefined') {
        return cols(...params.select!)
      }

      for (const join of params.join) {
        const joinPropName = typeof join === 'string' ? join : join[0]
        const referenceProp = joins[joinPropName].referenceProp

        if (params.select.includes(referenceProp) === FALSE) {
          params.select.push(referenceProp)
        }
      }

      return cols(...params.select)
    }

    async function findAll(params: FindAllParams | Where<T>[] | Where<T> = {}): Promise<T[]> {
      if (isWhere(params)) {
        // not without FindParams
        const whereProps = where(params)
        const sql = `SELECT ${allColumns} FROM "${table}" ${whereProps.sql}`

        return await query<T>(sql, whereProps.values)
      }

      // FindParams
      const sqlCols = prepareSelectColumns(params)
      const whereProps = where(params.where)

      let sql = `SELECT ${sqlCols} FROM "${table}" ${whereProps.sql}`

      if (typeof params.orderBy !== 'undefined') {
        sql += ` ORDER BY ${orderBy(params.orderBy)}`
      }

      if (typeof params.skip === 'number') {
        sql += ` OFFSET ${params.skip}`
      }
      if (typeof params.limit === 'number') {
        sql += ` LIMIT ${params.limit}`
      }

      const result = await query<T>(sql, whereProps.values, params.tx)
      if (result.length === 0) {
        return result
      }

      if (typeof params.join !== 'undefined') {
        await runJoins(result, params)
      }

      return result
    }

    async function findOneByParams(params: FindOneParams): Promise<T> {
      const sqlCols = prepareSelectColumns(params)
      let sql = `SELECT ${sqlCols} FROM "${table}"`


      if (typeof params.where !== 'object') {
        sql += ` WHERE "${primaryKey}" = ?`

        if (typeof params.orderBy !== 'undefined') {
          sql += ` ORDER BY ${orderBy(params.orderBy)}`
        }

        return (await query<T>(sql, [params.where], params.tx))[0]
      } else {
        const whereProps = where(params.where)
        sql += ` ${whereProps.sql}`

        if (typeof params.orderBy !== 'undefined') {
          sql += ` ORDER BY ${orderBy(params.orderBy)}`
        }

        return (await query<T>(sql, whereProps.values, params.tx))[0]
      }
    }

    async function findOne(params: FindOneParams | Where<T>[] | Where<T> | ID): Promise<T> {
      if (typeof params !== 'object') {
        // isPrimitive
        const sql = `SELECT ${allColumns} FROM "${table}" WHERE "${primaryKey}" = ?`

        return (await query<T>(sql, [params]))[0]
      }

      if (isWhere(params)) {
        // just Where
        const whereProps = where(params)
        const sql = `SELECT ${allColumns} FROM "${table}" ${whereProps.sql}`

        return (await query<T>(sql, whereProps.values))[0]
      }

      // FindParams
      const result = await findOneByParams(params)
      if (typeof result === 'undefined') {
        return result
      }

      if (typeof params.join !== 'undefined') {
        await runJoins(result, params)
      }

      return result
    }

    const modelName = tableNameToModelName(table)

    async function findOrFail(params: FindOneParams | Where<T>[] | Where<T> | ID): Promise<T> {
      const data = await findOne(params)

      if (typeof data === 'undefined') {
        throw new AuroraFail(modelName)
      }

      return data
    }

    async function exists(id: Where<T>[] | Where<T> | ID, tx?: Tx): Promise<boolean> {
      let sql = `SELECT COUNT(*)::integer as count FROM "${table}"`

      if (typeof id !== 'object') {
        sql += ` WHERE "${primaryKey}" = ? LIMIT 1`

        const res = (await query<{count: number}>(sql, [id], tx))[0]
        return res.count !== 0
      } else {
        const whereProps = where(id)
        sql += ` ${whereProps.sql}`

        const res = (await query<{count: number}>(sql, whereProps.values, tx))[0]
        return res.count !== 0
      }
    }

    async function existsOrFail(id: Where<T>[] | Where<T> | ID, tx?: Tx): Promise<boolean> {
      const isExists = await exists(id, tx)

      if (isExists === FALSE) {
        throw new AuroraFail(modelName)
      }

      return isExists
    }

    async function count(value: Where<T>[] | Where<T>, tx?: Tx): Promise<number> {
      const whereProps = where(value)
      const sql = `SELECT COUNT(*)::integer as count FROM "${table}" ${whereProps.sql}`

      const res = (await query<{count: number}>(sql, whereProps.values, tx))[0]

      return res.count
    }


    return {
      findAll,
      findOne,
      findOrFail,
      exists,
      existsOrFail,
      count,

      create,
      createMany,
      update,
      delete: del,
    }
  }
}
