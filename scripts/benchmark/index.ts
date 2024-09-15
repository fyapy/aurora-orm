import 'reflect-metadata'

import auroraorm from './auroraorm.js'
import postgres from './postgres.js'
import typeorm from './typeorm.js'
import pg from './pg.js'

// Run using Node
// node --import tsx/esm

// disable GC
// --max-old-space-size=1000 --max-semi-space-size=512 --noconcurrent_sweeping

await pg()
await postgres()
await auroraorm()
await typeorm()
