# Coming from lazyconvex

betterspace is the SpacetimeDB successor to lazyconvex.
The mental model is similar, but the underlying system is different.
This guide maps lazyconvex concepts to their betterspace equivalents.

## The big picture

| Concept          | lazyconvex (Convex)                              | betterspace (SpacetimeDB)               |
| ---------------- | ------------------------------------------------ | --------------------------------------- |
| Backend          | Convex cloud                                     | SpacetimeDB (Docker or Maincloud)       |
| Data model       | Document store (JSON)                            | Relational tables                       |
| Real-time        | `useQuery` with reactive queries                 | `useTable` with WebSocket subscriptions |
| Mutations        | `useMutation`                                    | `useReducer`                            |
| Server functions | Convex functions (`query`, `mutation`, `action`) | Reducers + Procedures                   |
| Provider         | `ConvexProvider`                                 | `SpacetimeDBProvider`                   |
| Auth             | ConvexAuth (JWT)                                 | Anonymous Identity + OIDC (Maincloud)   |
| File storage     | Convex storage                                   | S3/MinIO via API routes                 |
| IDs              | `Id<"tableName">` (string)                       | `u32` (number)                          |
| Schema           | Zod-based `defineTable`                          | `t.string()`, `t.u32()`, etc.           |

## Provider

```typescript
// lazyconvex
import { ConvexProvider, ConvexReactClient } from 'convex/react'

const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

<ConvexProvider client={client}>
  {children}
</ConvexProvider>
```

```typescript
// betterspace
import { SpacetimeDBProvider } from 'spacetimedb/react'
import { DbConnection } from '@/generated/module_bindings'

<SpacetimeDBProvider
  uri={process.env.NEXT_PUBLIC_SPACETIMEDB_URL!}
  module={process.env.NEXT_PUBLIC_MODULE_NAME!}
  createConnection={() => DbConnection.builder()}
>
  {children}
</SpacetimeDBProvider>
```

## Reading data

```typescript
// lazyconvex
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const posts = useQuery(api.blog.list, { published: true })
// posts is undefined while loading, then Post[] | null
```

```typescript
// betterspace
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated/module_bindings'

const [posts, isReady] = useTable(tables.post)
// posts is Post[] (empty until ready), isReady is false until synced
```

Key differences:

- `useQuery` returns `undefined` while loading.
  `useTable` returns an empty array immediately and `isReady` becomes `true` when the
  initial sync completes.
- `useQuery` takes a function reference and args.
  `useTable` takes a table reference (optionally with `.where()`).
- Convex queries run on the server and return computed results.
  SpacetimeDB subscriptions return raw table rows.

### Filtering

```typescript
// lazyconvex: server-side filtering in the query function
// convex/blog.ts
export const list = query({
  args: { published: v.boolean() },
  handler: async (ctx, { published }) => {
    return ctx.db
      .query('post')
      .withIndex('by_published', q => q.eq('published', published))
      .collect()
  }
})

// Client
const posts = useQuery(api.blog.list, { published: true })
```

```typescript
// betterspace: server-side WHERE or client-side filter
// Option A: server-side WHERE subscription
const [posts, isReady] = useTable(tables.post.where(r => r.published.eq(true)))

// Option B: client-side filter with useList
import { useList } from 'betterspace/react'

const [allPosts, isReady] = useTable(tables.post)
const { data: posts } = useList(allPosts, isReady, {
  where: { published: true }
})
```

### Pagination

```typescript
// lazyconvex
import { usePaginatedQuery } from 'convex/react'

const { results, status, loadMore } = usePaginatedQuery(
  api.blog.listPaginated,
  {},
  { initialNumItems: 20 }
)
```

```typescript
// betterspace
import { useList } from 'betterspace/react'

const [posts, isReady] = useTable(tables.post)
const { data, hasMore, loadMore, totalCount } = useList(posts, isReady, {
  pageSize: 20,
  sort: { field: 'updatedAt', direction: 'desc' }
})
```

## Writing data

```typescript
// lazyconvex
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

const createPost = useMutation(api.blog.create)
await createPost({ title: 'Hello', content: 'World' })
```

```typescript
// betterspace
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const createPost = useReducer(reducers.create_post)
await createPost({ title: 'Hello', content: 'World', published: false })
```

Key differences:

- `useMutation` takes a function reference from the generated API. `useReducer` takes a
  reducer reference from the generated bindings.
- Both return an async function.
  The call signature is the same (single object argument).
- Convex mutations can return values.
  SpacetimeDB reducers are fire-and-forget (use procedures for return values).

## Server functions

```typescript
// lazyconvex: Convex query function
// convex/blog.ts
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return ctx.db
      .query('post')
      .withIndex('by_slug', q => q.eq('slug', slug))
      .unique()
  }
})

// lazyconvex: Convex mutation
export const create = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    return ctx.db.insert('post', { ...args, userId, published: false })
  }
})

// lazyconvex: Convex action (can call external APIs)
export const fetchFromApi = action({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const data = await fetch(`https://api.example.com/${id}`).then(r =>
      r.json()
    )
    await ctx.runMutation(api.cache.store, { id, data })
    return data
  }
})
```

```typescript
// betterspace: SpacetimeDB reducer (equivalent to mutation)
// In your SpacetimeDB module
export const createPost = spacetimedb.reducer(
  { name: 'create_post' },
  { title: t.string(), content: t.string() },
  (ctx, args) => {
    ctx.db.post.insert({
      id: 0,
      title: args.title,
      content: args.content,
      published: false,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    })
  }
)

// betterspace: SpacetimeDB procedure (can return values)
export const getPostBySlug = spacetimedb.procedure(
  { name: 'get_post_by_slug' },
  { slug: t.string() },
  (ctx, { slug }) => {
    for (const post of ctx.db.post) {
      if (post.slug === slug) return post
    }
    throw new SenderError('NOT_FOUND: post:getBySlug')
  }
)

// betterspace: external API calls via Next.js API route
// (ctx.http.fetch panics in local Docker; use API routes instead)
// app/api/fetch-movie/route.ts
export const GET = async (req: Request) => {
  const data = await fetch('https://api.example.com/...').then(r => r.json())
  // Store in SpacetimeDB via reducer call
  return Response.json(data)
}
```

## Schema definition

```typescript
// lazyconvex
// convex/schema.ts
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  post: defineTable({
    title: v.string(),
    content: v.string(),
    published: v.boolean(),
    userId: v.string()
  }).index('by_published', ['published'])
})
```

```typescript
// betterspace
// packages/be/t.ts
import { makeOwned } from 'betterspace/schema'
import { boolean, object, string } from 'zod/v4'

const owned = makeOwned({
  post: object({
    content: string(),
    published: boolean(),
    title: string()
  })
})

export { owned }
```

```typescript
// betterspace
// packages/be/spacetimedb/src/index.ts
import { betterspace } from 'betterspace/server'
import { owned } from '../../t'

export default betterspace(({ table }) => ({
  post: table(owned.post, { index: ['published'] })
}))
```

Key differences:

- Convex uses `v.string()`, `v.boolean()`, etc.
  betterspace uses standard Zod: `string()`, `boolean()`, etc.
- Convex IDs are strings (`Id<"post">`). SpacetimeDB IDs are numbers (`u32`).
- Both add system fields automatically (`id`, `updatedAt`, `userId` in betterspace;
  `_id`, `_creationTime` in Convex).
- betterspace uses `{ index: ['published'] }` shorthand instead of
  `.index('by_published', ['published'])`.

## IDs

```typescript
// lazyconvex: string IDs
const postId: Id<'post'> = post._id // 'k17abc...'
await updatePost({ id: postId, title: 'New title' })

// In URLs
const url = `/posts/${postId}` // works, it's a string
```

```typescript
// betterspace: numeric IDs (u32 = number)
const postId: number = post.id // 42
await updatePost({ id: postId, title: 'New title' })

// In URLs
const url = `/posts/${postId}` // works, number coerces to string
// Or explicitly:
import { idToWire } from 'betterspace'
const url = `/posts/${idToWire(postId)}` // '42'
```

## Auth

```typescript
// lazyconvex: ConvexAuth with JWT
// convex/auth.ts
import { convexAuth } from '@convex-dev/auth/server'
export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google]
})

// In mutations
const userId = await getAuthUserId(ctx)
```

```typescript
// betterspace: anonymous Identity (dev) or OIDC (production)
// In reducers, the caller's identity is always available:
;(ctx, args) => {
  const userId = ctx.sender // Identity object
  // ctx.sender is always set (anonymous connections get a unique Identity)
}

// Compare identities
import { identityEquals } from 'betterspace/server'
identityEquals(ctx.sender, row.userId) // true/false

// Convert to string for storage/comparison
ctx.sender.toHexString() // 'c200725ff16b4c1d...'
```

For production auth with real users, SpacetimeDB supports OIDC providers via Maincloud.
Local dev uses anonymous connections with stable tokens.

## File storage

```typescript
// lazyconvex: Convex built-in storage
const storageId = await generateUploadUrl()
// Upload to storageId...
await ctx.storage.getUrl(storageId) // get download URL
```

```typescript
// betterspace: S3/MinIO via Next.js API routes
// 1. Client calls /api/upload/presign to get a pre-signed URL
// 2. Client uploads directly to S3/MinIO
// 3. Client calls register_upload_file reducer to record the upload

import { useUpload } from 'betterspace/react'

const { upload } = useUpload({
  apiEndpoint: '/api/upload/presign',
  registerFile: async ({ storageKey, ...meta }) => {
    await registerUpload({ storageKey, ...meta })
    return { storageId: storageKey }
  }
})
```

## Error handling

```typescript
// lazyconvex
// In mutations:
throw new ConvexError({ code: 'NOT_FOUND', message: 'Post not found' })

// On client:
try {
  await createPost(data)
} catch (error) {
  if (error instanceof ConvexError) {
    console.log(error.data.code)
  }
}
```

```typescript
// betterspace
// In reducers:
throw new SenderError('NOT_FOUND: post:update')

// On client:
import { extractErrorData, getErrorCode } from 'betterspace'

try {
  await createPost(data)
} catch (error) {
  const code = getErrorCode(error) // 'NOT_FOUND'
  const data = extractErrorData(error) // { code, message, table, op }
}
```

## Real-time latency

Convex reactive queries update within ~100-300ms. SpacetimeDB subscriptions update
within ~39ms (local Docker).
Optimistic updates are unnecessary at this latency.

## What doesn’t exist in betterspace (yet)

| lazyconvex feature           | Status in betterspace                                                |
| ---------------------------- | -------------------------------------------------------------------- |
| `usePaginatedQuery`          | Use `useList` with `loadMore`                                        |
| Optimistic updates           | Not needed at 39ms latency; `useOptimisticMutation` is a placeholder |
| `skip` option on queries     | Conditionally render the subscribing component instead               |
| Built-in rate limiting       | Implement manually with a tracking table                             |
| `ctx.http.fetch` in reducers | Panics in local Docker; use Next.js API routes                       |
| Full OAuth (Google, GitHub)  | Requires Maincloud; local dev uses anonymous identity                |
