import http, {Server} from 'node:http'

import {readFile} from '../utils.js'

export function createServer() {
  const port = 3060

  const server = http.createServer((req, res) => {
    if (req.url === '/') {
      const data = readFile('./scripts/benchmark/results.json')

      res.writeHead(200, {'Content-Type': 'text/html'})
      res.write(readFile('./scripts/benchmark/index.html').replace('const data = []', `const data = ${data}`))
    }

    if (req.url === '/highcharts.js') {
      res.writeHead(200, {'Content-Type': 'text/javascript'})
      res.write(readFile('./scripts/benchmark/assets/highcharts.txt'))
    }
    if (req.url === '/exporting.js') {
      res.writeHead(200, {'Content-Type': 'text/javascript'})
      res.write(readFile('./scripts/benchmark/assets/exporting.txt'))
    }
    if (req.url === '/export-data.js') {
      res.writeHead(200, {'Content-Type': 'text/javascript'})
      res.write(readFile('./scripts/benchmark/assets/export-data.txt'))
    }
    if (req.url === '/accessibility.js') {
      res.writeHead(200, {'Content-Type': 'text/javascript'})
      res.write(readFile('./scripts/benchmark/assets/accessibility.txt'))
    }

    res.end()
  })

  return new Promise<{url: string, server: Server}>(resolve => {
    server.listen(port, () => {
      const url = `http://localhost:${port}`
      console.log(`Server started on ${url}`)
      resolve({url, server})
    })
  })
}
