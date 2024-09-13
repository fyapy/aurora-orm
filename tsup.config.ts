import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/index.ts'],
  target: 'node22',
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  treeshake: false,
  sourcemap: false,
  tsconfig: './tsconfig.json',
})
