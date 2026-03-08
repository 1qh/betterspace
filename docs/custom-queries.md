# Custom Queries

## SpacetimeDB procedures

Procedures are server-side functions that can return values, run transactions, and call
external services.
Unlike reducers (which are fire-and-forget), procedures return data to
the caller.

Define a procedure in your SpacetimeDB module:

```typescript
// In your SpacetimeDB module
import { schema, t, table } from 'spacetimedb/server'

const spacetimedb = schema({ post, comment })
```

`spacetimedb` is the module object returned by SpacetimeDB’s `schema()` function, which
provides `.reducer()`, `.procedure()`, and `.table()` methods.

```typescript
// A procedure that inserts a post and returns its ID
export const createPostAndReturn = spacetimedb.procedure(
  { name: 'create_post_and_return' },
  {
    title: t.string(),
    content: t.string()
  },
  async (ctx, { title, content }) => {
    const row = ctx.db.post.insert({
      id: 0,
      title,
      content,
      published: false,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    })
    return row.id // u32 returned as number
  }
)
```

Call it from the client:

```typescript
import { useSpacetimeDB } from 'spacetimedb/react'

const { getConnection } = useSpacetimeDB()
const conn = getConnection()

const id = await conn.reducers.create_post_and_return({
  title: 'Hello',
  content: 'World'
})
console.log('Created post with ID:', id)
```

## Transactions with ctx.withTx

`ctx.withTx` wraps multiple operations in a transaction.
If any operation throws, all changes are rolled back.

Use `ctx.withTx()` for atomic multi-step operations.
If any step throws, all changes roll back:

```typescript
export const transferPost = spacetimedb.procedure(
  { name: 'transfer_post' },
  { postId: t.u32(), newOwnerId: t.identity() },
  async (ctx, { postId, newOwnerId }) => {
    return ctx.withTx(tx => {
      const post = tx.db.post.id.find(postId)
      if (!post) throw new SenderError('NOT_FOUND: post:transfer')

      // Both updates are atomic
      tx.db.post.id.update({
        ...post,
        userId: newOwnerId,
        updatedAt: tx.timestamp
      })
      tx.db.audit_log.insert({
        action: 'transfer',
        postId,
        fromUser: ctx.sender,
        toUser: newOwnerId,
        at: tx.timestamp
      })
    })
  }
)
```

If `tx.db.audit_log.insert` throws, the `post.id.update` is also rolled back.
No partial writes.

## Subscription patterns beyond basic CRUD

### Subscribing to multiple tables

You can have multiple active subscriptions on a single connection.
Each subscription is independent:

```typescript
'use client'

import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated/module_bindings'

const Dashboard = () => {
  // Three independent subscriptions
  const [posts, postsReady] = useTable(tables.post)
  const [comments, commentsReady] = useTable(tables.comment)
  const [presence, presenceReady] = useTable(tables.presence)

  const isReady = postsReady && commentsReady && presenceReady
}
```

### Conditional subscriptions

SpacetimeDB doesn’t have a built-in `skip` option.
Conditionally render the subscribing component instead:

```typescript
// Instead of:
const [data] = useTable(condition ? tables.post : undefined)  // not supported

// Do this:
const ConditionalData = ({ enabled }: { enabled: boolean }) => {
  if (!enabled) return null
  return <DataConsumer />
}

const DataConsumer = () => {
  const [data] = useTable(tables.post)
  // ...
}
```

### Subscribing to views

Views are subscribable like tables.
Define a view in your module SQL and subscribe to it:

```typescript
// Client-side: subscribe to a view
const [postsWithAuthors, isReady] = useTable(tables.post_with_author)
// postsWithAuthors contains joined data from post + profile tables
```

Views update automatically when the underlying tables change.
Delta updates are pushed to subscribers.

## SQL API for complex queries

The HTTP SQL API supports arbitrary SQL queries.
Use it for:

- Complex joins that aren’t worth defining as views
- Aggregations (COUNT, SUM, AVG)
- SSR data fetching in Next.js Server Components
- One-off data exploration

```typescript
const STDB_URL = 'http://localhost:3000'
const MODULE = 'my-app'

const query = async (sql: string) => {
  const res = await fetch(`${STDB_URL}/v1/database/${MODULE}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: sql
  })
  if (!res.ok) throw new Error(`SQL error: ${res.status}`)
  const [result] = (await res.json()) as [{ rows: unknown[][] }]
  return result.rows
}

// Count posts by category
const counts = await query(`
  SELECT category, COUNT(*) as count
  FROM post
  WHERE published = true
  GROUP BY category
  ORDER BY count DESC
`)

// Join with profile
const postsWithAuthors = await query(`
  SELECT p.id, p.title, pr.display_name as author
  FROM post p
  LEFT JOIN profile pr ON pr.user_id = p.user_id
  WHERE p.published = true
  LIMIT 20
`)
```

The SQL API returns:

```json
[
  {
    "schema": {
      "elements": [
        { "name": "category", "algebraicType": { "tag": "String" } },
        { "name": "count", "algebraicType": { "tag": "U64" } }
      ]
    },
    "rows": [
      ["tech", 42],
      ["news", 17]
    ],
    "total_duration_micros": 269
  }
]
```

Latency is ~0.27ms for simple queries on local Docker.

### Typed SQL helper

```typescript
// lib/sql.ts
const STDB_URL = process.env.SPACETIMEDB_URL ?? 'http://localhost:3000'
const MODULE = process.env.MODULE_NAME ?? 'my-app'

interface SqlResult<T> {
  rows: T[]
  durationMicros: number
}

const sql = async <T>(query: string): Promise<SqlResult<T>> => {
  const res = await fetch(`${STDB_URL}/v1/database/${MODULE}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: query,
    cache: 'no-store'
  })

  if (!res.ok) throw new Error(`SQL query failed: ${res.status}`)

  const [result] = (await res.json()) as [
    {
      rows: unknown[][]
      schema: { elements: { name: string }[] }
      total_duration_micros: number
    }
  ]

  const keys = result.schema.elements.map(e => e.name)
  const rows = result.rows.map(row => {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < keys.length; i++) obj[keys[i]!] = row[i]
    return obj as T
  })

  return { rows, durationMicros: result.total_duration_micros }
}

export { sql }
```

Usage:

```typescript
// app/posts/page.tsx (Server Component)
import { sql } from '@/lib/sql'

const PostsPage = async () => {
  const { rows } = await sql<{ id: number; title: string }>(
    'SELECT id, title FROM post WHERE published = true ORDER BY id DESC LIMIT 20'
  )
  return <ul>{rows.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

## Scheduled reducers

Use scheduled reducers for deferred or recurring work:

```typescript
// In your SpacetimeDB module
import { ScheduleAt } from 'spacetimedb/server'
```

`ScheduleAt` is a SpacetimeDB type for scheduling future reducer calls.

```typescript
const jobSchedule = table(
  { public: false },
  {
    id: t.u32().autoInc().primaryKey(),
    scheduledAt: t.scheduleAt(), // special column type
    payload: t.string().optional()
  }
)

// This reducer runs when a scheduled row fires
export const processJob = spacetimedb.reducer(
  { name: 'process_job', scheduledReducer: true },
  {},
  ctx => {
    // Do work here
    console.log('Job fired at', ctx.timestamp)
  }
)

// Schedule a job from another reducer
export const scheduleJob = spacetimedb.reducer(
  { name: 'schedule_job' },
  { delayMs: t.u64() },
  (ctx, { delayMs }) => {
    const fireAt = ctx.timestamp.addMilliseconds(delayMs)
    ctx.db.jobSchedule.insert({
      id: 0,
      scheduledAt: ScheduleAt.time(fireAt),
      payload: null
    })
  }
)
```

Cancel a scheduled job by deleting its row:

```typescript
ctx.db.jobSchedule.id.delete(jobId)
```

Scheduled reducers are useful for:

- Cache TTL expiration (delete stale entries after N days)
- Delayed notifications
- Retry logic with backoff

## Rate limiting

SpacetimeDB doesn’t have built-in rate limiting.
Implement it with a tracking table:

```typescript
// In your SpacetimeDB module
const rateLimit = table(
  { public: false },
  {
    id: t.u32().autoInc().primaryKey(),
    userId: t.identity().index(),
    action: t.string().index(),
    windowStart: t.timestamp(),
    count: t.u32()
  }
)

const checkRateLimit = (
  ctx: ReducerContext,
  action: string,
  maxPerWindow: number,
  windowMs: number
) => {
  const now = ctx.timestamp
  const existing = ctx.db.rateLimit.userId
    .filter(ctx.sender)
    .find(r => r.action === action)

  if (!existing) {
    ctx.db.rateLimit.insert({
      id: 0,
      userId: ctx.sender,
      action,
      windowStart: now,
      count: 1
    })
    return
  }

  const windowExpired =
    now.toMillis() - existing.windowStart.toMillis() >= windowMs
  if (windowExpired) {
    ctx.db.rateLimit.id.update({ ...existing, count: 1, windowStart: now })
    return
  }

  if (existing.count >= maxPerWindow) {
    throw new SenderError('RATE_LIMITED: too many requests')
  }

  ctx.db.rateLimit.id.update({ ...existing, count: existing.count + 1 })
}

// Use in a reducer
export const createPost = spacetimedb.reducer(
  { name: 'create_post' },
  { title: t.string(), content: t.string() },
  (ctx, args) => {
    checkRateLimit(ctx, 'create_post', 10, 60_000) // 10 per minute
    // ... rest of create logic
  }
)
```

This adds a write to every rate-limited reducer call.
For demo apps, defer rate limiting until needed.
