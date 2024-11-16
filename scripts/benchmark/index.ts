import timer from 'node:timers/promises'
import puppeteer from 'puppeteer'
import 'reflect-metadata'

import auroraormPostgres from './auroraormPostgres.js'
import auroraormPg from './auroraormPg.js'
import {createServer} from './server.js'
import {writeJSON} from '../utils.js'
import postgres from './postgres.js'
import typeorm from './typeorm.js'
import pg from './pg.js'

const results = [
  await postgres(),
  await timer.setTimeout(1000),
  await auroraormPostgres(),
  await timer.setTimeout(1000),
  await pg(),
  await timer.setTimeout(1000),
  await auroraormPg(),
  await timer.setTimeout(1000),
  await typeorm(),
].filter(v => !!v)

writeJSON('./scripts/benchmark/results.json', results)


const {server, url} = await createServer()

const browser = await puppeteer.launch({
  defaultViewport: {width: 800, height: 370, deviceScaleFactor: 2},
  headless: true,
})

try {
  const page = await browser.newPage()

  await page.goto(url, {waitUntil: 'domcontentloaded'})
  await timer.setTimeout(1000)

  await page.screenshot({path: './scripts/benchmark/results.png'})
} catch (e) {
  console.error(e)
} finally {
  await browser.close()
}

server.close()
