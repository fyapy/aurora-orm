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

  const templateFileName = path.resolve(import.meta.dirname, '../../templates/migration-template.ts')
  // file name looks like migrations/1391877300255_migration-title.ts
  const newFile = `${directory}/${time}_${name}.ts`

  fs.copyFileSync(templateFileName, newFile)

  return newFile
}
