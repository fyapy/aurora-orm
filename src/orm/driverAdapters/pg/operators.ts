import type { WhereValues } from "../../types"

interface Options {
  values: WhereValues
  alias: string
}

export const whereOperators = {
  'more-than': (value: string, opts: Options) => {
    opts.values.push(value)

    return `${opts.alias} > ?`
  },
  'between': (value: any, opts: Options) => {
    opts.values.push(value.more)
    opts.values.push(value.less)

    return `${opts.alias} BETWEEN ? AND ?`
  },
  'less-than': (value: string, opts: Options) => {
    opts.values.push(value)

    return `${opts.alias} < ?`
  },
  'in': (value: string, opts: Options) => {
    opts.values.push(value)

    return `${opts.alias} = ANY(?)`
  },
  'not-null': (value: string, opts: Options) => `${opts.alias} IS NOT NULL`,
  'ilike': (value: string, opts: Options) => {
    opts.values.push(`%${value}%`)

    return `${opts.alias} ILIKE ?`
  },
  'is-null': (value: string, opts: Options) => `${opts.alias} IS NULL`,
  'not-in': (value: string, opts: Options) => {
    opts.values.push(value as any)

    return `NOT (${opts.alias} = ANY(?))`
  },
  'ilike-start': (value: string, opts: Options) => {
    opts.values.push(`${value}%`)

    return  `LOWER(${opts.alias}) ILIKE ?`
  },
  'not-equal': (value: string, opts: Options) => {
    opts.values.push(value)

    return `${opts.alias} != ?`
  },
}


export const setOperators: Record<string, (alias: string) => string> = {
  increment: alias => `${alias} = ${alias} + ?`,
  decrement: alias => `${alias} = ${alias} - ?`,
}
