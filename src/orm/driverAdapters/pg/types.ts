import type {
  PostgresqlConnectionStringConfig,
  RemoveIdnetifiers,
  Postgresql,
} from '../../../connection/types'
import type { QueryConfig } from '../../types'

export type Config = RemoveIdnetifiers<PostgresqlConnectionStringConfig | Postgresql>

export interface AbstractClient {
  query(sql: string | QueryConfig, values?: any[] | null): Promise<any>
  end(): Promise<void>
  release(): void
}
export interface AbstractPoolRuntime extends AbstractClient {
  connect(): Promise<AbstractClient>
}
export type OrmLog = (sql: string, values?: any[] | null) => void
