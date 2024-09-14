import fs from 'node:fs'
import { exec } from './utils.js'

console.info('Package start building!')

await exec('pnpm tsup')

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'))

delete packageJson.devDependencies
delete packageJson.scripts

fs.writeFileSync('./dist/package.json', JSON.stringify(packageJson, null, 2))

fs.cpSync('./readme.md', './dist/readme.md', {recursive: true})
fs.cpSync('./templates', './dist/templates', {recursive: true})
fs.cpSync('./bin', './dist/bin', {recursive: true})

console.info('Package successfully builded!')
