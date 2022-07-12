import dotenv from 'dotenv'

export function loadEnv(path?: string) {
  dotenv.config(path ? { path } : {})
}

export const getEnvVariable = (name: string): any => process.env[name]
