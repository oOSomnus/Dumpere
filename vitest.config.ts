import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // NOTE: jsdom is for renderer/React tests. Main process tests (src/main/**)
    // should NOT use jsdom - they need 'node' environment.
    // We handle this via separate test files or vi.mock() isolation.
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.ts'
    ],
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
