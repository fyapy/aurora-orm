import {configExtractEnv, loadConnectionConfig} from '../config'

describe('connection/config', () => {
  const connectionString = 'postgres://aabdullin:123@localhost:5432/aurora'

  test('should load aurora-orm.json', () => {
    const config = loadConnectionConfig()

    expect(config).toEqual({connectionString, driver: 'pg'})
  })

  test('should throw error if env dont exists', () => {
    const fn = () => configExtractEnv({
      connectionString: 'env:DATABASE_URL',
      driver: 'pg' as any,
    })

    expect(fn).toThrow(Error)
  })

  test('should\'t throw error if env exists', () => {
    const extractedEnvConfig = configExtractEnv({connectionString, driver: 'pg' as any})

    expect(extractedEnvConfig).toEqual({connectionString, driver: 'pg'})
  })
})
