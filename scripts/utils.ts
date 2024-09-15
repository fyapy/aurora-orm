import {exec as _exec} from 'node:child_process'
import {promisify} from 'node:util'
import fs from 'node:fs'

export const exec = promisify(_exec)

export function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function readJSON<T = any>(path: string) {
  return JSON.parse(fs.readFileSync(path, 'utf8')) as T
}

export function writeJSON(path: string, json: any) {
  return fs.writeFileSync(path, JSON.stringify(json, null, 2))
}

export function cp(from: string, to: string) {
  return fs.cpSync(from, to, {recursive: true})
}

export const fixed = (num: number, fix = 3) => num.toFixed(fix)

export interface BenchResult {
  iters: number
  min: string
  max: string
  p50: string
  p75: string
  p99: string
  avg: string
  'ops/s': string
}

export async function bench(iters: number, fn: () => any) {
  const samples: number[] = []

  await fn() // cold start

  for (let index = 0; index < iters; index++) {
    const startTime = performance.now()
    await fn()
    const endTime = performance.now()

    samples.push(endTime - startTime)
  }

  samples.sort((a, b) => a - b)

  const avg = samples.reduce((a, b) => a + b, 0) / samples.length

  return <BenchResult>{
    iters,
    min: fixed(samples[0]),
    max: fixed(samples[samples.length - 1]),
    p50: fixed(samples[(.50 * samples.length) | 0]),
    p75: fixed(samples[(.75 * samples.length) | 0]),
    p99: fixed(samples[(.99 * samples.length) | 0]),
    avg: fixed(avg),
    'ops/s': fixed(1_000 / avg, 1),
  }
}

export function formatResult(name: string, r: {
  insert: BenchResult
  select: BenchResult
}) {
  console.log(`Driver - ${name}`)
  console.log(`Insert - ${r.insert['ops/s']} ops/s`)
  console.log(`Select - ${r.select['ops/s']} ops/s\n`)
}
