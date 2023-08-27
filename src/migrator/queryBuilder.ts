const MigratorOperator = {
  CreateTable: 'create-table',
  DropTable: 'drop-table',
  AlterTable: 'alter-table'
} as const

export const ColumnOperator = {
  AddColumn: 'add-column',
  DropColumn: 'drop-column',
  SetDefault: 'set-default',
  SetType: 'set-type',
} as const

export type DefaultColumn = {sql: string}
export const now: DefaultColumn = {sql: '(now())'}
export const uuidGenerateV4: DefaultColumn = {sql: 'uuid_generate_v4()'}

export type Default = string | number | DefaultColumn

export interface Column {
  type: 'uuid' | 'varchar' | 'smallint' | 'timestamptz' | 'text' | 'bool' | 'char'
  primary?: boolean
  default?: Default
  notNull?: boolean
  unique?: boolean
}
export const column = (opts: Column) => opts

interface AddColumn {
  operator: typeof ColumnOperator.AddColumn
  type: string
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
  type: typeof MigratorOperator.CreateTable
  table: string
  columns: Record<string, Column>
}
export const createTable = (table: string, columns: Record<string, Column>): CreateTable => ({
  type: MigratorOperator.CreateTable,
  table,
  columns,
})

export type AlterColumn = AddColumn | DropColumn | SetDefault | SetType

export interface AlterTable {
  type: typeof MigratorOperator.AlterTable
  table: string
  columns: Record<string, AlterColumn>
}
export const alterTable = (table: string, columns: Record<string, AlterColumn>): AlterTable => ({
  type: MigratorOperator.AlterTable,
  table,
  columns,
})

export type DropTable = {
  type: typeof MigratorOperator.DropTable
  table: string
}
export const dropTable = (table: string): DropTable => ({type: MigratorOperator.DropTable, table})
