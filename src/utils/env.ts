import path from 'node:path'
import fs from 'node:fs'

export function loadEnv() {
  // @ts-ignore is Bun runtime
  if (typeof global.Bun !== 'undefined') return

  const dotenvPath = path.resolve(process.cwd(), '.env')

  if (fs.existsSync(dotenvPath) === true) {
    const processEnv = process.env
    const dotenvFile = fs.readFileSync(dotenvPath, {encoding: 'utf-8'})

    dotenvFile.split('\n')
      .filter(str => str.trim() !== '')
      .map(str => {
        const [name, value] = str.trim().split('=')

        if (value[0] === '\'' && value[value.length - 1] === '\'') {
          return [name, value.substring(1, value.length - 1)]
        }

        return [name, value]
      })
      .forEach(([name, value]) => {
        if (typeof processEnv[name] === 'undefined') {
          processEnv[name] = value
        }
      })
  }
}

export const getEnvVariable = (name: string): any => process.env[name]
