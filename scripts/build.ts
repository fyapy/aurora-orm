import {deleteFile, writeJSON, readJSON, exec, cp} from './utils.js'

console.info('Package start linting!')

await exec('pnpm lint')

console.info('Package start building!')

await exec('pnpm tsup')
deleteFile('./dist/index.d.cts')

const packageJson = readJSON('./package.json')

delete packageJson.devDependencies
delete packageJson.scripts
delete packageJson.type

writeJSON('./dist/package.json', packageJson)

cp('./readme.md', './dist/readme.md')
cp('./templates', './dist/templates')
cp('./bin', './dist/bin')

console.info('Package successfully builded!')
