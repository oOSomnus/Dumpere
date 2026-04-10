import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['src/main/**', 'node']
    ],
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: ['e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/main/**', 'src/preload/**', 'src/renderer/**'],
      exclude: ['**/*.test.ts', '**/*.spec.ts', '**/*.tsx']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
