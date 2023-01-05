import formBodyPlugin from '@fastify/formbody'
import fastify from 'fastify'

import { typeormPlugin } from './typeorm'

const DEFAULT_BODY_SIZE_LIMIT = 1024 * 1024 * 10
const PORT = 8080

const app = fastify()

app.register(formBodyPlugin, {
  bodyLimit: DEFAULT_BODY_SIZE_LIMIT,
})


async function main() {
  await app.register(typeormPlugin)

  const url = await app.listen({
    port: PORT,
    host: '0.0.0.0',
  })
  console.log(`Server started, url: ${url}`)
}

main()
