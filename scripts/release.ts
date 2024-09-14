import {exec} from './utils.js'
import './build.js'

await exec('npm publish', {cwd: './dist'})

console.info('Package successfully published!')
