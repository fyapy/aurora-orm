import './build.js'
import { exec } from './utils.js'

await exec('npm publish', {cwd: '../'})
