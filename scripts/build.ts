import {writeJSON, readJSON, exec, cpy} from './utils.js'

console.info('Package start linting!')

await exec('pnpm lint')

console.info('Package start building!')

await exec('pnpm tsup')

const packageJson = readJSON('./package.json')

delete packageJson.devDependencies
delete packageJson.scripts

writeJSON('./dist/package.json', packageJson)

cpy('./readme.md', './dist/readme.md')
cpy('./templates', './dist/templates')
cpy('./bin', './dist/bin')

console.info('Package successfully builded!')
