import type {Operator, SetOperator} from './types'

export const whereOperator = 'operator'

export const MoreThan = <T extends number | string>(value: T): Operator => ({
  type: whereOperator,
  name: 'more-than',
  value,
})
export const Between = <T extends number | string>(more: T, less: T): Operator => ({
  type: whereOperator,
  name: 'between',
  value: {more, less},
})
export const LessThan = <T extends number | string>(value: T): Operator => ({
  type: whereOperator,
  name: 'less-than',
  value,
})

export const In = <T extends string | number | null>(value: T[]): Operator => ({
  type: whereOperator,
  name: 'in',
  value,
})
export const Includes = <T extends string | number>(value: T): Operator => ({
  type: whereOperator,
  name: 'includes',
  value,
})

export const NotNull: Operator = ({type: whereOperator, name: 'not-null'})

export const ILike = <T extends number | string | null>(value: T): Operator => ({
  type: whereOperator,
  name: 'ilike',
  value,
})

export const IsNull: Operator = ({type: whereOperator, name: 'is-null'})
export const NotIn = (value: Array<string | number>): Operator => ({type: whereOperator, name: 'not-in', value})
export const ILikeStart = (value: string): Operator => ({type: whereOperator, name: 'ilike-start', value})
export const NotEqual = (value: any): Operator => ({type: whereOperator, name: 'not-equal', value})


export const setOperator = 'set-operator'

export const Increment = (value: number): SetOperator => ({type: setOperator, name: 'increment', value})
export const Decrement = (value: number): SetOperator => ({type: setOperator, name: 'decrement', value})
