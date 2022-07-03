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

export const MoreThan = <T extends number | string>(value: T): types.SQL => ({
  type: 'sql',
  fn: (options) => {
    options.values.push(value)

    return `${options.alias} > ?`
  },
})
export const Between = <T extends number | string>(more: T, less: T): types.SQL => ({
  type: 'sql',
  fn: (options) => {
    options.values.push(more)
    options.values.push(less)

    return `${options.alias} BETWEEN ? AND ?`
  },
})
export const LessThan = <T extends number | string>(value: T): types.SQL => ({
  type: 'sql',
  fn: (options) => {
    options.values.push(value)

    return `${options.alias} < ?`
  },
})

export const In = <T extends string | number | null>(value: T[]): types.SQL => ({
  type: 'sql',
  fn: (options) => {
    options.values.push(value)

    return `${options.alias} = ANY(?)`
  },
})

export const NotNull = (): types.SQL => ({
  type: 'sql',
  fn: (options) => `${options.alias} IS NOT NULL`,
})

export const ILike = <T extends number | string | null>(value: T): types.SQL => ({
  type: 'sql',
  fn: (options) => {
    options.values.push(`%${value}%`)

    return `${options.alias} ILIKE ?`
  },
})

export const IsNull = (): types.SQL => ({
  type: 'sql',
  fn: (options) => `${options.alias} IS NULL`,
})
export const NotIn = (value: Array<string | number>): types.SQL => ({
  type: 'sql',
  fn: otps => {
    otps.values.push(value as any)

    return `NOT (${otps.alias} = ANY(?))`
  },
})
export const ILikeStart = (value: string): types.SQL => ({
  type: 'sql',
  fn: otps => {
    otps.values.push(`${value}%`)

    return  `LOWER(${otps.alias}) ILIKE ?`
  },
})
export const NotEqual = (val: any): types.SQL => ({
  type: 'sql',
  fn: (options) => {
    options.values.push(val)

    return `${options.alias} != ?`
  },
})
