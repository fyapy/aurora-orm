import fs from 'node:fs'
import path from 'node:path'
import * as mkdirp from 'mkdirp'


export async function createMigration({ name, directory }: {
  name: string
  directory: string
}) {
  // ensure the migrations directory exists
  mkdirp.sync(directory)

  const time = new Date().valueOf()

  const templateFileName = path.resolve(import.meta.dirname, '../../templates/migration-template.ts')
  // file name looks like migrations/1391877300255_migration-title.ts
  const newFile = `${directory}/${time}_${name}.ts`

  await new Promise((resolve, reject) => fs.createReadStream(templateFileName)
    .pipe(fs.createWriteStream(newFile))
    .on('close', resolve)
    .on('error', reject))

  return newFile
}
