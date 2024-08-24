export const ColumnOperator = {
  AddColumn: 'add-column',
  DropColumn: 'drop-column',
  SetDefault: 'set-default',
  SetType: 'set-type',
} as const

export type DefaultColumn = {sql: string}
export const now: DefaultColumn = {sql: '(now())'}
export const uuidV4: DefaultColumn = {sql: 'uuid_generate_v4()'}
export const emptyArray: DefaultColumn = {sql: "'{}'"}

export type Default = string | number | DefaultColumn
export type Type = 'uuid' | 'varchar' | 'smallint' | 'integer' | 'real' | 'timestamptz' | 'text' | 'bool' | 'char' | 'jsonb'

export interface Column {
  type: Type
  primary?: boolean
  default?: Default
  notNull?: boolean
  unique?: boolean
}
export const column = (opts: Column) => opts

interface AddColumn {
  operator: typeof ColumnOperator.AddColumn
  type: Type
  notNull?: boolean
  default?: Default
}
export const addColumn = (opts: Omit<AddColumn, 'operator'>): AddColumn => ({
  ...opts,
  operator: ColumnOperator.AddColumn,
})

interface DropColumn {
  operator: typeof ColumnOperator.DropColumn
}
export const dropColumn: DropColumn = {operator: ColumnOperator.DropColumn}

interface SetDefault {
  operator: typeof ColumnOperator.SetDefault
  value: Default
}
export const setDefault = (value: SetDefault['value']): SetDefault => ({operator: ColumnOperator.SetDefault, value})

interface SetType {
  operator: typeof ColumnOperator.SetType
  type: string
}
export const setType = (type: SetType['type']): SetType => ({operator: ColumnOperator.SetType, type})

export type CreateTable = {
  table: string
  columns: Record<string, Column>
}
export const createTable = (table: string, columns: Record<string, Column>): CreateTable => ({
  table,
  columns,
})

export type AlterColumn = AddColumn | DropColumn | SetDefault | SetType

export interface AlterTable {
  table: string
  columns: Record<string, AlterColumn>
}
export const alterTable = (table: string, columns: Record<string, AlterColumn>): AlterTable => ({
  table,
  columns,
})

export type DropTable = {
  table: string
}
export const dropTable = (table: string): DropTable => ({table})

export type Foreign = {
  table: string
  key: string
}
export type ForeignKey = {
  foreign: Foreign
  reference: Foreign
}
export const foreignKey = (foreign: Foreign, reference: Foreign): ForeignKey => ({
  foreign,
  reference,
})

export type DropConstraint = {
  table: string
  column: string
}
export const dropConstraint = (table: string, column: string): DropConstraint => ({
  table,
  column,
})

export type Value = string | number | boolean
export type Insert = {
  table: string
  values: Record<string, Value>
}
export const insert = (table: string, values: Record<string, Value>): Insert => ({table, values})
