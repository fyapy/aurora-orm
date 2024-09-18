import path from 'node:path'
import fs from 'node:fs'

export function createMigrationFile({name, directory}: {
  name: string
  directory: string
}) {
  // ensure the migrations directory exists
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {recursive: true})
  }

  const time = new Date().valueOf()

  const templateFileName = path.resolve(import.meta.dirname, 'templates', 'migration-template.ts')
  const newFile = path.join(directory, `${time}_${name}.ts`)

  fs.copyFileSync(templateFileName, newFile)

  return newFile.replace(process.cwd(), '')
}
