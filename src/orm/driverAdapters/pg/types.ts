import type { QueryConfig } from '../../types.js'

export interface AbstractClient {
  query(sql: string | QueryConfig, values?: any[] | null): Promise<any>
  end(): Promise<void>
  release(): void
}
export interface AbstractPoolRuntime extends AbstractClient {
  connect(): Promise<AbstractClient>
}
export type OrmLog = (sql: string, values?: any[] | null) => void
