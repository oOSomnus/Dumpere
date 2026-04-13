import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
import { resolve } from 'path'

const alias = {
  '@': resolve(__dirname, 'src')
}

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart(args) { args.startup() },
        vite: {
          resolve: { alias },
          build: {
            outDir: 'dist/main',
            rollupOptions: { external: ['electron'], output: { format: 'cjs' } }
          }
        }
      },
      {
        entry: 'src/preload/index.ts',
        onstart(args) { args.reload() },
        vite: {
          resolve: { alias },
          build: { outDir: 'dist/preload', rollupOptions: { output: { format: 'cjs' } } }
        }
      }
    ]),
    renderer({
      build: {
        modulePreload: { polyfill: false }
      }
    })
  ],
  resolve: { alias },
  build: { outDir: 'dist/renderer' }
})
