import { defineConfig, devices } from '@playwright/test'

interface PlaywrightOptions {
  port: number
  webServerUrl?: string
}

const createPlaywrightConfig = ({ port, webServerUrl }: PlaywrightOptions) => {
  process.env.NEXT_PUBLIC_PLAYWRIGHT = '1'
  process.env.PLAYWRIGHT = '1'
  const baseURL = `http://localhost:${port}`,
    isCI = Boolean(process.env.CI)

  return defineConfig({
    expect: { timeout: 5000 },
    forbidOnly: isCI,
    fullyParallel: false,
    globalSetup: './e2e/global-setup.ts',
    globalTeardown: './e2e/global-teardown.ts',
    outputDir: './test-results',
    projects: [
      {
        name: 'chromium',
        use: {
          ...devices['Desktop Chrome'],
          screenshot: 'only-on-failure',
          trace: 'retain-on-failure',
          video: 'retain-on-failure'
        }
      }
    ],
    reporter: [['html', { open: 'never' }], ['list']],
    retries: 2,
    testDir: './e2e',
    timeout: 30_000,
    use: { baseURL },
    webServer: {
      command: `dotenv -e ../../.env -- bun --cwd ../../ spacetime:health && dotenv -e ../../.env -- bun --cwd ../../ spacetime:publish && dotenv -e ../../.env -- env PLAYWRIGHT=1 SPACETIMEDB_TEST_MODE=true NEXT_PUBLIC_PLAYWRIGHT=1 next dev --turbo --port ${port}`,
      env: { NEXT_PUBLIC_PLAYWRIGHT: '1', PLAYWRIGHT: '1', SPACETIMEDB_TEST_MODE: 'true' },
      reuseExistingServer: !isCI,
      stdout: 'pipe',
      timeout: 120_000,
      url: webServerUrl ?? baseURL
    },
    workers: 1
  })
}

export { createPlaywrightConfig }
