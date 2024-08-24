import type { WhereOperatorOptions } from "../../types"

export const whereOperators = {
  'more-than': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(value)

    return `${opts.alias} > ?`
  },
  'between': (value: any, opts: WhereOperatorOptions) => {
    opts.values.push(value.more)
    opts.values.push(value.less)

    return `${opts.alias} BETWEEN ? AND ?`
  },
  'less-than': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(value)

    return `${opts.alias} < ?`
  },
  'in': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(value)

    return `${opts.alias} = ANY(?)`
  },
  'includes': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(value)

    return `? = ANY(${opts.alias})`
  },
  'not-null': (value: string, opts: WhereOperatorOptions) => `${opts.alias} IS NOT NULL`,
  'ilike': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(`%${value}%`)

    return `${opts.alias} ILIKE ?`
  },
  'is-null': (value: string, opts: WhereOperatorOptions) => `${opts.alias} IS NULL`,
  'not-in': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(value as any)

    return `NOT (${opts.alias} = ANY(?))`
  },
  'ilike-start': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(`${value}%`)

    return  `LOWER(${opts.alias}) ILIKE ?`
  },
  'not-equal': (value: string, opts: WhereOperatorOptions) => {
    opts.values.push(value)

    return `${opts.alias} != ?`
  },
}


export const setOperators: Record<string, (alias: string) => string> = {
  increment: alias => `${alias} = ${alias} + ?`,
  decrement: alias => `${alias} = ${alias} - ?`,
}
