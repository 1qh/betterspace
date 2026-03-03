import { execSync } from 'node:child_process'

import { ensureTestUser } from './org-helpers'

const SPACETIME_PUBLISH_CMD =
    'export PATH="/Users/o/.local/bin:$PATH" && spacetime publish betterspace --module-path spacetimedb',
  getHost = () => process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? 'http://localhost:3000',
  ensureSpacetimeHealthy = async () => {
    const response = await fetch(`${getHost()}/v1/ping`)
    if (!response.ok) throw new Error('SpacetimeDB is not healthy at NEXT_PUBLIC_SPACETIMEDB_HOST')
  },
  publishModule = () => {
    execSync(SPACETIME_PUBLISH_CMD, {
      cwd: '../../packages/be',
      stdio: 'pipe'
    })
  },
  globalSetup = async () => {
    process.env.SPACETIMEDB_TEST_MODE = 'true'
    await ensureSpacetimeHealthy()
    publishModule()
    await ensureTestUser()
  }

export default globalSetup
