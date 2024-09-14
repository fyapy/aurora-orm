import path from 'node:path'
import fs from 'node:fs'

export async function loadMigrationFiles(dir: string) {
  const dirContent = await fs.promises.readdir(path.join(process.cwd(), dir), {withFileTypes: true})
  const files = dirContent
    .map(file => (file.isFile() || file.isSymbolicLink() ? file.name : null))
    .filter((file): file is string => Boolean(file))
    .sort()

  return files
}
