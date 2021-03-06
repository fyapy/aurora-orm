import type { ConnectionConfig } from './types'
import fs from 'node:fs'
import path from 'node:path'
import { getEnvVariable } from '../utils/env'

const configExtractEnv = (json: ConnectionConfig) => Object.keys(json).reduce((acc, key) => {
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

function formatConifg(config: ConnectionConfig | ConnectionConfig[]) {
  if (Array.isArray(config)) {
    return config.map(json => {
      if (!json.name) {
        throw new Error(`Array connections in 'aurora-orm.json' must have a 'name' property`)
      }

      return configExtractEnv(json)
    })
  }

  return configExtractEnv(config)
}

export function loadConnectionConfig() {
  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'aurora-orm.json')) as unknown as string,
    ) as ConnectionConfig

    return formatConifg(config)
  } catch (e) {
    console.error(e)
    throw new Error('"aurora-orm.json" cannot be readed')
  }
}
