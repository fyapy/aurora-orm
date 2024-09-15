import path from 'node:path'
import fs from 'node:fs'

export async function loadMigrationFilePaths(directory: string) {
  const files = await fs.promises.readdir(directory, {withFileTypes: true})

  return files
    .map(file => file.isFile() || file.isSymbolicLink() ? path.join(directory, file.name) : null)
    .filter((file): file is string => Boolean(file))
    .sort()
}
