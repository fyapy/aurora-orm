import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    v1: './src/migrator/v1.ts',
  },
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
