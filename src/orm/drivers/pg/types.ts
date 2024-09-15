export interface AbstractClient {
  query(sql: string, values?: any[] | null): Promise<any>
  end(): Promise<void>
  release(destroy?: boolean): void
}
export interface AbstractPoolRuntime extends AbstractClient {
  connect(): Promise<AbstractClient>
}
export interface NewAbstractPoolRuntime extends AbstractPoolRuntime {
  new(config: Record<string, any>): AbstractPoolRuntime
}
export type OrmLog = (sql: string, values?: any[] | null) => void
