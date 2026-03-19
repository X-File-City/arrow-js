import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/sandbox-e2e',
  fullyParallel: true,
  webServer: {
    command:
      'pnpm --filter @arrow-js/sandbox exec vite --config demo/vite.config.ts --host 127.0.0.1 --port 4175',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://127.0.0.1:4175',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
