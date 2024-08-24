import type { ConnectionConfig } from './types.js'
import fs from 'node:fs'
import path from 'node:path'
import { getEnvVariable, loadEnv } from '../utils/env.js'

export const configExtractEnv = (json: ConnectionConfig) => Object.keys(json).reduce((acc, key) => {
  const val = json[key]

  if (typeof val === 'string' && val.startsWith('env:')) {
    const envName = val.replace('env:', '')
    const envVal = getEnvVariable(envName)

    if (!envVal) {
      throw new Error(`The "${envName}" environment variable is not set.`)
    }

    acc[key] = envVal
  } else if (typeof val === 'object' && !Array.isArray(val)) {
    acc[key] = configExtractEnv(val)
  } else {
    acc[key] = val
  }

  return acc
}, {} as ConnectionConfig)

export function loadConnectionConfig() {
  loadEnv()
  const configString = fs.readFileSync(path.join(process.cwd(), 'aurora-orm.json')) as unknown as string
  const config = JSON.parse(configString) as ConnectionConfig

  return configExtractEnv(config)
}
