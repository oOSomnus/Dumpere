import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) { args.startup() },
        vite: { build: { outDir: 'dist/main', rollupOptions: { external: ['electron'], output: { format: 'cjs' } } } }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(args) { args.reload() },
        vite: { build: { outDir: 'dist/preload', rollupOptions: { output: { format: 'cjs' } } } }
      }
    ]),
    renderer({
      build: {
        modulePreload: { polyfill: false }
      }
    })
  ],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  build: { outDir: 'dist/renderer' }
})
