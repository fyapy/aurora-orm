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
  type: 'uuid' | 'varchar' | 'smallint' | 'timestamptz'
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

// need add custom sql edit hook

// CREATE TABLE "cities" (
//   "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
//   "name" varchar NOT NULL,
//   "slug" varchar UNIQUE NOT NULL,
//   "order" smallint NOT NULL DEFAULT 0,
//   "country_id" uuid NOT NULL,
//   "created_at" timestamptz NOT NULL DEFAULT (now())
// );

// createTable('cities', {
//   id: column({type: 'uuid', primary: true, default: uuidGenerateV4}),
//   name: column({type: 'varchar', notNull: true}),
//   slug: column({type: 'varchar', unique: true, notNull: true}),
//   order: column({type: 'smallint', default: 0}),
//   country_id: column({type: 'uuid', notNull: true}),
//   created_at: column({type: 'timestamptz', notNull: true, default: now}),
// })


// DROP TABLE "prices";

// dropTable('prices')


// ALTER TABLE "journal"
// ADD COLUMN "lang" char(2) NOT NULL DEFAULT 'ru';

// alterTable('journal', {
//   lang: addColumn({type: 'char(2)', notNull: true, default: 'ru'})
// })


// ALTER TABLE "dialogs"
// DROP COLUMN "create_reason",
// DROP COLUMN "create_user_id";

// alterTable('dialogs', {
//   create_reason: dropColumn,
//   create_user_id: dropColumn,
// })


// ALTER TABLE "users"
// ALTER COLUMN "lat" SET DEFAULT 0,
// ALTER COLUMN "lng" SET DEFAULT 0;

// alterTable('users', {
//   lat: setDefault(0),
//   lng: setDefault(0),
// })


// ALTER TABLE "reports"
// ALTER COLUMN "reason" TYPE varchar;

// alterTable('reports', {
//   reason: setType('varchar'),
// })
