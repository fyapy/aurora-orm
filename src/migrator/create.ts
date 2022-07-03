import fs from 'node:fs'
import path from 'node:path'
import mkdirp from 'mkdirp'


export async function createMigration({ name, directory }: {
  name: string
  directory: string
}) {
  // ensure the migrations directory exists
  mkdirp.sync(directory)

  const time = new Date().valueOf()

  const templateFileName = path.resolve(process.cwd(), 'templates/migration-template.js')
  // file name looks like migrations/1391877300255_migration-title.js
  const newFile = `${directory}/${time}_${name}.js`

  await new Promise((resolve, reject) => fs.createReadStream(templateFileName)
    .pipe(fs.createWriteStream(newFile))
    .on('close', resolve)
    .on('error', reject))

  return newFile
}
