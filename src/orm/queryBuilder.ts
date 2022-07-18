import * as types from './types'

export function buildAliasMapper<T extends types.AnyObject>(obj: Record<keyof T, types.ColumnData>) {
  const _mapper = new Map<keyof T, string>()

  for (const [key, value] of Object.entries(obj)) {
    _mapper.set(key, typeof value === 'string'
      ? value
      : value.name)
  }

  return (col: keyof T): string => `"${_mapper.get(col)!}"`
}

export const insertValues = (values: any[]) => values.map((_, index) => `$${index + 1}`).join(', ')

export const SQLParams = (sql: string) => sql.split('?')
  .reduce((acc, curr, index, arr) => acc += arr.length - 1 === index
    ? curr
    : `${curr}$${index + 1}`, '')

export const MoreThan = <T extends number | string>(value: T): types.Operator => ({
  type: 'operator',
  name: 'more-than',
  fn: (options) => {
    options.values.push(value)

    return `${options.alias} > ?`
  },
})
export const Between = <T extends number | string>(more: T, less: T): types.Operator => ({
  type: 'operator',
  name: 'between',
  fn: (options) => {
    options.values.push(more)
    options.values.push(less)

    return `${options.alias} BETWEEN ? AND ?`
  },
})
export const LessThan = <T extends number | string>(value: T): types.Operator => ({
  type: 'operator',
  name: 'less-than',
  fn: (options) => {
    options.values.push(value)

    return `${options.alias} < ?`
  },
})

export const In = <T extends string | number | null>(value: T[]): types.Operator => ({
  type: 'operator',
  name: 'in',
  fn: (options) => {
    options.values.push(value)

    return `${options.alias} = ANY(?)`
  },
})

export const NotNull = (): types.Operator => ({
  type: 'operator',
  name: 'not-null',
  fn: (options) => `${options.alias} IS NOT NULL`,
})

export const ILike = <T extends number | string | null>(value: T): types.Operator => ({
  type: 'operator',
  name: 'ilike',
  fn: (options) => {
    options.values.push(`%${value}%`)

    return `${options.alias} ILIKE ?`
  },
})

export const IsNull = (): types.Operator => ({
  type: 'operator',
  name: 'is-null',
  fn: (options) => `${options.alias} IS NULL`,
})
export const NotIn = (value: Array<string | number>): types.Operator => ({
  type: 'operator',
  name: 'not-in',
  fn: otps => {
    otps.values.push(value as any)

    return `NOT (${otps.alias} = ANY(?))`
  },
})
export const ILikeStart = (value: string): types.Operator => ({
  type: 'operator',
  name: 'ilike-start',
  fn: otps => {
    otps.values.push(`${value}%`)

    return  `LOWER(${otps.alias}) ILIKE ?`
  },
})
export const NotEqual = (val: any): types.Operator => ({
  type: 'operator',
  name: 'not-equal',
  fn: (options) => {
    options.values.push(val)

    return `${options.alias} != ?`
  },
})
