import {defineConfig} from 'tsup'

export default defineConfig({
  entry: {
    index: './src/index.ts',
  },
  target: 'node22',
  format: ['esm', 'cjs'],
  outDir: 'dist',
  clean: true,
  dts: true,
  splitting: false,
  treeshake: false,
  sourcemap: false,
  tsconfig: './tsconfig.json',
})
