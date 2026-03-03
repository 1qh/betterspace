# Data Fetching

SpacetimeDB uses subscriptions, not queries. When you subscribe to a table, you receive the current state and all future changes over a WebSocket. There's no separate "fetch" step.

## Subscriptions are the data layer

```typescript
'use client'

import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated/module_bindings'

const Posts = () => {
  const [posts, isReady] = useTable(tables.post)
  // posts: Post[] -- all rows, updated in real-time
  // isReady: boolean -- false until initial sync completes
}
```

`isReady` is `false` until the initial subscription sync finishes. After that, `posts` updates automatically whenever any client calls a reducer that modifies the `post` table.

## Server-side filtering with WHERE

SpacetimeDB subscriptions support SQL WHERE clauses. Use `tables.post.where(...)` to subscribe to a filtered subset:

```typescript
// Only published posts
const [published, isReady] = useTable(
  tables.post.where(r => r.published.eq(true))
)

// Posts by a specific user
const [myPosts, isReady] = useTable(
  tables.post.where(r => r.userId.eq(currentIdentity))
)
```

Multiple WHERE subscriptions on the same table work independently. Unsubscribing from one doesn't affect others.

## Client-side filtering with useList

For filtering that doesn't map cleanly to a single WHERE clause, subscribe to the full table and filter client-side with `useList`:

```typescript
'use client'

import { useTable } from 'spacetimedb/react'
import { useList } from 'betterspace/react'
import { tables } from '@/generated/module_bindings'

const PostList = ({ category }: { category: string }) => {
  const [posts, isReady] = useTable(tables.post)

  const { data, hasMore, loadMore, totalCount } = useList(posts, isReady, {
    where: { category, published: true },
    sort: { field: 'updatedAt', direction: 'desc' },
    pageSize: 20,
  })

  return (
    <div>
      <p>{totalCount} posts</p>
      <ul>
        {data.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </div>
  )
}
```

### useList options

```typescript
useList(data, isReady, {
  // Filter rows (AND conditions, with optional OR groups)
  where: {
    published: true,
    category: 'tech',
    or: [{ category: 'news' }],
  },

  // Sort by a field
  sort: { field: 'updatedAt', direction: 'desc' },
  // Or shorthand:
  sort: { updatedAt: 'desc' },

  // Pagination
  pageSize: 20,
  page: 1,  // controlled page (optional)
})
```

The return value:

```typescript
{
  data: T[]        // current page of filtered, sorted rows
  hasMore: boolean // whether more rows exist beyond current page
  isLoading: boolean
  loadMore: () => void
  page: number
  totalCount: number
}
```

`useList` is purely client-side. It doesn't make any network requests. All filtering and sorting happens over the in-memory subscription data.

## Comparison operators in where

```typescript
useList(posts, isReady, {
  where: {
    voteCount: { $gte: 100 },
    releaseYear: { $between: [2020, 2024] },
  },
})
```

Supported operators: `$gt`, `$gte`, `$lt`, `$lte`, `$between`.

## Filtering by current user

Use `own: true` in the where clause to filter rows where `userId` matches the current viewer:

```typescript
// This requires passing the viewer's identity to matchW internally.
// For now, filter by identity explicitly:
const [myPosts, isReady] = useTable(
  tables.post.where(r => r.userId.eq(identity))
)
```

## Pagination patterns

### Infinite scroll (load more)

```typescript
const { data, hasMore, loadMore } = useList(posts, isReady, {
  pageSize: 20,
})

// Render a "Load more" button or use an intersection observer
```

### Controlled page

```typescript
const [page, setPage] = useState(1)

const { data, totalCount } = useList(posts, isReady, {
  pageSize: 20,
  page,
})

// Traditional page controls
const totalPages = Math.ceil(totalCount / 20)
```

## SSR with the HTTP SQL API

SpacetimeDB exposes an HTTP endpoint for SQL queries. This is ideal for Next.js Server Components where you can't use WebSockets.

```typescript
// app/posts/page.tsx (Server Component)
const STDB_URL = process.env.SPACETIMEDB_URL ?? 'http://localhost:3000'
const MODULE = process.env.MODULE_NAME ?? 'my-app'

type SqlRow = [number, string, string, boolean]

const fetchPosts = async () => {
  const res = await fetch(`${STDB_URL}/v1/database/${MODULE}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'SELECT id, title, content, published FROM post WHERE published = true ORDER BY id DESC LIMIT 20',
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to fetch posts')

  const [result] = await res.json() as [{ rows: SqlRow[] }]
  return result.rows.map(([id, title, content, published]) => ({
    id,
    title,
    content,
    published,
  }))
}

const PostsPage = async () => {
  const posts = await fetchPosts()
  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

export default PostsPage
```

The HTTP SQL API returns:

```json
[{
  "schema": {
    "elements": [
      { "name": "id", "algebraicType": { "tag": "U32" } },
      { "name": "title", "algebraicType": { "tag": "String" } }
    ]
  },
  "rows": [[1, "Hello world"], [2, "Second post"]],
  "total_duration_micros": 269
}]
```

Latency is ~0.27ms for simple queries on local Docker.

## Views for computed/joined data

SpacetimeDB views are subscribable. Define a view in your module and subscribe to it like any table:

```typescript
// In your SpacetimeDB module (server-side)
// Views are defined in SQL and registered with the schema
// They update automatically when underlying tables change

// Client-side subscription to a view
const [postsWithAuthors, isReady] = useTable(tables.post_with_author)
```

Views are useful for:
- Joining tables (post + user profile)
- Filtering by `ctx.sender` for per-user data (read-side ACL)
- Computing derived fields

## No loading spinners for updates

Because subscriptions push deltas, you don't need to show a loading state when a reducer runs. The UI updates within ~39ms (local Docker). Optimistic updates are unnecessary at this latency.

If you're deploying to Maincloud and latency is higher, you can add optimistic updates later. The `useOptimisticMutation` hook from `betterspace/react` provides a placeholder API for this.

## Known limitations

- Subscriptions don't support `ORDER BY` or `LIMIT`. Sort and paginate client-side with `useList`.
- `ctx.http.fetch()` inside procedures panics in local Docker (networking issue). Use Next.js API routes for external HTTP calls.
- No built-in rate limiting. See [custom queries](./custom-queries.md) for a manual approach.
