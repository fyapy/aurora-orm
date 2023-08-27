// import formBodyPlugin from '@fastify/formbody'
// import fastify from 'fastify'

import postgres from "postgres"

// import { typeormPlugin } from './typeorm'

// const DEFAULT_BODY_SIZE_LIMIT = 1024 * 1024 * 10
// const PORT = 8080

// const app = fastify()

// app.register(formBodyPlugin, {
//   bodyLimit: DEFAULT_BODY_SIZE_LIMIT,
// })


// async function main() {
//   await app.register(typeormPlugin)

//   const url = await app.listen({
//     port: PORT,
//     host: '0.0.0.0',
//   })
//   console.log(`Server started, url: ${url}`)
// }

// main()

async function main() {
  const sql = postgres('postgres://aabdullin:123@localhost:5432/aurora')

  const fragment = sql``
  const colComma = sql`, `

  const table = sql('test_table')
  const columns = {
    id: sql('id'),
    text: sql('text'),
    createdAt: sql`${sql('created_at')} as ${sql('createdAt')}`,
  }
  const allColumns = Object.keys(columns)

  function join(cols: string[]) {
    const colsLength = cols.length - 1

    return cols.reduce((acc, column, index) => {
      const isEnd = colsLength === index
      const comma = isEnd ? fragment : colComma

      return sql`${acc} ${columns[column]}${comma}`
    }, fragment)
  }

  const res = await sql`SELECT ${join(allColumns)} FROM ${table}${false ? sql`where text = '1'` : fragment}`

  console.log('res', res)

  await sql.end()
}
main()
