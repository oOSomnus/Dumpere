import { defineConfig } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const electronPath = path.join(__dirname, 'node_modules/electron/dist/electron')
const appPath = path.join(__dirname, 'dist')

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  // Custom electron configuration
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.spec\.ts/,
      use: {
        // Pass electron path and app path via environment
        baseURL: `file://${appPath}/renderer/index.html`,
      },
      // No webServer - we launch electron manually in tests
    },
  ],
})
