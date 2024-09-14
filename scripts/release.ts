import './build.js'
import { exec } from './utils.js'

await exec('npm publish', {cwd: './dist'})

console.info('Package successfully published!')
