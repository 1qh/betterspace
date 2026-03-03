# Testing

## Local SpacetimeDB for tests

All tests run against a local SpacetimeDB instance. Start it with Docker:

```bash
docker compose up -d
```

Wait for it to be healthy before running tests:

```bash
docker compose ps  # spacetimedb should show "healthy"
```

Publish your module before running integration tests:

```bash
spacetime publish my-app-test --module-path packages/be/spacetimedb/
```

Use a separate module name for tests (e.g., `my-app-test`) so tests don't interfere with your dev module.

## Unit tests with Bun

Bun's built-in test runner works for testing pure logic, schema utilities, and server-side helpers.

```typescript
// packages/be/spacetimedb/__tests__/schema.test.ts
import { describe, expect, it } from 'bun:test'
import { zodFromTable } from 'betterspace'
import { tables } from '../module_bindings'

describe('zodFromTable', () => {
  it('generates a schema from a table definition', () => {
    const schema = zodFromTable(tables.post.columns)
    const result = schema.safeParse({
      title: 'Hello',
      content: 'World',
      published: false,
    })
    expect(result.success).toBe(true)
  })

  it('excludes auto-increment and identity fields by default', () => {
    const schema = zodFromTable(tables.post.columns)
    // id, userId, updatedAt are excluded automatically
    expect(Object.keys(schema.shape)).not.toContain('id')
    expect(Object.keys(schema.shape)).not.toContain('userId')
  })
})
```

Run unit tests:

```bash
bun test packages/be/spacetimedb/__tests__/
```

## Integration tests

Integration tests connect to a real SpacetimeDB instance and call reducers.

### Test helper: connectAsTestUser

SpacetimeDB assigns a stable `Identity` when you reconnect with a saved token. Use this to create deterministic test users:

```typescript
// test-helpers/connect.ts
import { DbConnection } from '../module_bindings'

const TOKEN_CACHE = new Map<string, string>()

export const connectAsTestUser = async (name: string): Promise<DbConnection> => {
  const savedToken = TOKEN_CACHE.get(name)

  return new Promise((resolve, reject) => {
    const builder = DbConnection.builder()
      .withUri('ws://localhost:3000')
      .withModuleName('my-app-test')

    if (savedToken) {
      builder.withToken(savedToken)
    }

    builder
      .onConnect((conn, identity, token) => {
        TOKEN_CACHE.set(name, token)
        resolve(conn)
      })
      .onError(reject)
      .build()
  })
}
```

### Writing integration tests

```typescript
// __tests__/blog.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { connectAsTestUser } from '../test-helpers/connect'
import { reducers, tables } from '../module_bindings'

describe('blog CRUD', () => {
  let conn: Awaited<ReturnType<typeof connectAsTestUser>>

  beforeEach(async () => {
    conn = await connectAsTestUser('alice')
  })

  afterEach(() => {
    conn.disconnect()
  })

  it('creates a post', async () => {
    await conn.reducers.create_post({
      title: 'Test post',
      content: 'Test content',
      published: false,
    })

    // Wait for subscription to update
    await new Promise(resolve => setTimeout(resolve, 100))

    const posts = [...conn.db.post.iter()]
    const created = posts.find(p => p.title === 'Test post')
    expect(created).toBeDefined()
    expect(created?.published).toBe(false)
  })

  it('rejects update from non-owner', async () => {
    // Alice creates a post
    await conn.reducers.create_post({
      title: 'Alice post',
      content: 'Content',
      published: false,
    })
    await new Promise(resolve => setTimeout(resolve, 100))

    const posts = [...conn.db.post.iter()]
    const post = posts.find(p => p.title === 'Alice post')
    expect(post).toBeDefined()

    // Bob tries to update it
    const bob = await connectAsTestUser('bob')
    await expect(
      bob.reducers.update_post({ id: post!.id, title: 'Hacked' })
    ).rejects.toThrow()
    bob.disconnect()
  })
})
```

## Auth in tests

SpacetimeDB uses anonymous connections for local testing. Each connection gets a unique `Identity`. Reconnecting with the same token gives the same `Identity`.

```typescript
// First connection: gets a new identity + token
const conn1 = await connectAsTestUser('alice')
// conn1.identity is alice's identity

// Disconnect and reconnect: same identity
conn1.disconnect()
const conn2 = await connectAsTestUser('alice')
// conn2.identity === conn1.identity (same hex string)
```

For tests that need multiple users, call `connectAsTestUser` with different names:

```typescript
const alice = await connectAsTestUser('alice')
const bob = await connectAsTestUser('bob')
// alice.identity !== bob.identity
```

Tokens are cached in memory per test run. For persistent tokens across runs, save them to a file:

```typescript
import { readFileSync, writeFileSync } from 'fs'

const TOKEN_FILE = '.test-tokens.json'

const loadTokens = (): Record<string, string> => {
  try {
    return JSON.parse(readFileSync(TOKEN_FILE, 'utf-8')) as Record<string, string>
  } catch {
    return {}
  }
}

const saveTokens = (tokens: Record<string, string>) => {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2))
}
```

## E2E tests with Playwright

E2E tests run against the full stack: Next.js dev server + SpacetimeDB.

### Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 10_000,
  use: {
    baseURL: 'http://localhost:3001',
  },
  webServer: {
    command: 'bun dev',
    url: 'http://localhost:3001',
    reuseExistingServer: !process.env.CI,
  },
})
```

### Writing E2E tests

```typescript
// e2e/blog.test.ts
import { expect, test } from '@playwright/test'

test('creates and displays a post', async ({ page }) => {
  await page.goto('/')

  // Wait for connection
  await page.waitForSelector('[data-testid="post-list"]')

  // Create a post
  await page.click('[data-testid="new-post-button"]')
  await page.fill('[name="title"]', 'E2E test post')
  await page.fill('[name="content"]', 'Test content')
  await page.click('[type="submit"]')

  // Post appears in the list (real-time update)
  await expect(page.getByText('E2E test post')).toBeVisible()
})

test('deletes a post', async ({ page }) => {
  await page.goto('/')
  await page.waitForSelector('[data-testid="post-list"]')

  const postTitle = `Delete test ${Date.now()}`
  await page.click('[data-testid="new-post-button"]')
  await page.fill('[name="title"]', postTitle)
  await page.fill('[name="content"]', 'To be deleted')
  await page.click('[type="submit"]')

  await expect(page.getByText(postTitle)).toBeVisible()

  await page.click(`[data-testid="delete-${postTitle}"]`)

  await expect(page.getByText(postTitle)).not.toBeVisible()
})
```

### Running E2E tests

```bash
# Start SpacetimeDB first
docker compose up -d

# Run a single test (recommended during development)
timeout 30 bun playwright test e2e/blog.test.ts --timeout=8000

# Run all E2E tests
bun test:e2e
```

Follow the [E2E testing strategy](../AGENTS.md) for timeout rules and debugging hanging tests.

## Test isolation

SpacetimeDB doesn't have built-in test isolation (no per-test database reset). Options:

1. **Use unique identifiers**: prefix test data with a timestamp or UUID so tests don't collide.
2. **Clean up in afterEach**: call `rm_*` reducers to delete test data after each test.
3. **Use a fresh module**: publish a new module name for each test run (slower but fully isolated).

```typescript
// Option 1: unique prefix
const testId = Date.now()
await conn.reducers.create_post({
  title: `Test post ${testId}`,
  content: 'Content',
  published: false,
})
```

## Running all tests

```bash
bun test:all
```

This runs unit tests and E2E tests in parallel. All tests must pass before pushing.
