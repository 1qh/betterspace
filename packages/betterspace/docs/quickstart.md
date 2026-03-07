# Quickstart

This guide takes you from zero to a working blog CRUD app with real-time updates.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (for SpacetimeDB + MinIO)
- [Bun](https://bun.sh) >= 1.1
- [SpacetimeDB CLI](https://spacetimedb.com/install) v2.0+
- Node.js >= 20 (for Next.js)

Install the CLI:

```bash
curl -sSf https://install.spacetimedb.com | sh
```

## Project setup

```bash
mkdir my-app && cd my-app
bunx betterspace init
```

`betterspace init` auto-installs all required dependencies and creates a `tsconfig.json`
with the right settings.
No manual `bun add` step needed.

## Start the local backend

The Docker Compose file starts SpacetimeDB (port 3000) and MinIO for file storage (port
9000):

```bash
# From your project root, create docker-compose.yml:
cat > docker-compose.yml << 'EOF'
services:
  spacetimedb:
    image: clockworklabs/spacetime:latest
    command: start --listen-addr 0.0.0.0:3000
    ports:
      - "3000:3000"
    volumes:
      - spacetimedb_data:/stdb
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
    restart: unless-stopped

volumes:
  spacetimedb_data:
  minio_data:
EOF

docker compose up -d
```

Wait for SpacetimeDB to be healthy:

```bash
docker compose ps  # spacetimedb should show "healthy"
```

## Define your schema

Create your SpacetimeDB module files.
Define shared Zod schemas in `t.ts`, then wire everything together with `betterspace()`
in `src/index.ts`.

### Step 1: Field definitions (`t.ts`)

```typescript
import { makeOwned, makeSingleton } from 'betterspace/schema'
import { object, string } from 'zod/v4'

const owned = makeOwned({
  post: object({ title: string(), content: string() })
})

const singleton = makeSingleton({
  profile: object({ displayName: string(), bio: string().optional() })
})

export { owned, singleton }
```

### Step 2: Backend module (`src/index.ts`)

`betterspace()` builds the schema, registers CRUD reducers, and exports the module.
System fields (`id`, `updatedAt`, `userId`) are added automatically:

```typescript
import { betterspace } from 'betterspace/server'
import { owned, singleton } from '../../t'

export default betterspace(({ ownedTable, singletonTable, t }) => ({
  post: ownedTable(owned.post, { published: t.bool().index() }),
  profile: singletonTable(singleton.profile)
}))
```

## Publish the module

```bash
spacetime publish my-app --module-path packages/be/spacetimedb/
```

This compiles your TypeScript module and deploys it to the local SpacetimeDB instance.
The module name (`my-app`) is what clients connect to.

## Generate TypeScript bindings

```bash
spacetime generate \
  --lang typescript \
  --module-path packages/be/spacetimedb/ \
  --out-dir packages/be/spacetimedb/module_bindings/
```

This generates typed client code from your module.
Re-run this whenever you change the schema.

The generated output includes:

- `DbConnection` class for connecting
- `tables` object with typed table accessors
- `reducers` object with typed reducer callers
- Row types matching your table definitions

## Connect from React

### Provider setup

Wrap your app with `SpacetimeDBProvider`:

```typescript
// app/providers.tsx
'use client'

import { SpacetimeDBProvider } from 'spacetimedb/react'
import { createSpacetimeClient, createTokenStore } from 'betterspace/react'
import { DbConnection } from '@/generated/module_bindings'

const SPACETIMEDB_URL = process.env.NEXT_PUBLIC_SPACETIMEDB_URL ?? 'ws://localhost:3000'
const MODULE_NAME = process.env.NEXT_PUBLIC_MODULE_NAME ?? 'my-app'
const tokenStore = createTokenStore()

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <SpacetimeDBProvider
    uri={SPACETIMEDB_URL}
    module={MODULE_NAME}
    createConnection={() =>
      createSpacetimeClient({
        DbConnection,
        moduleName: MODULE_NAME,
        tokenStore,
        uri: SPACETIMEDB_URL,
      })
    }
  >
    {children}
  </SpacetimeDBProvider>
)
```

```typescript
// app/layout.tsx
import { Providers } from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Reading data

`useTable` subscribes to a table and returns all rows in real-time:

```typescript
'use client'

import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated/module_bindings'

const PostList = () => {
  const [posts, isReady] = useTable(tables.post)

  if (!isReady) return <div>Loading...</div>

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}

export default PostList
```

### Filtering and search

`useList` supports client-side filtering, sorting, and debounced search:

```typescript
'use client'

import { useState } from 'react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated/module_bindings'
import { useList } from 'betterspace/react'

const PostSearch = () => {
  const [posts, isReady] = useTable(tables.post)
  const [query, setQuery] = useState('')

  const { data, totalCount } = useList(posts, isReady, {
    search: { query, fields: ['title', 'content'], debounceMs: 300 },
    where: { published: true },
    sort: { field: 'updatedAt', direction: 'desc' },
  })

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search posts..." />
      <p>{totalCount} results</p>
      <ul>
        {data.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}

export default PostSearch
```

The `debounceMs: 300` option delays the search filter until the user stops typing for
300ms, avoiding unnecessary re-renders on every keystroke.

### Writing data

`useReducer` returns a function that calls a server-side reducer:

```typescript
'use client'

import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const CreatePost = () => {
  const createPost = useReducer(reducers.create_post)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    await createPost({
      title: form.get('title') as string,
      content: form.get('content') as string,
      published: false,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create post</button>
    </form>
  )
}

export default CreatePost
```

## Full blog example

Here’s a complete working component with create, update, and delete:

```typescript
'use client'

import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'
import { reducers, tables } from '@/generated/module_bindings'
import { useList, useOwnRows } from 'betterspace/react'

const BlogApp = () => {
  const [posts, isReady] = useTable(tables.post)
  const { identity } = useSpacetimeDB()

  const ownedPosts = useOwnRows(posts, identity ? p => p.userId.isEqual(identity) : null)

  const { data, hasMore, loadMore, totalCount } = useList(ownedPosts, isReady, {
    sort: { field: 'updatedAt', direction: 'desc' },
    pageSize: 20,
    where: { own: true },
  })

  const createPost = useReducer(reducers.create_post)
  const updatePost = useReducer(reducers.update_post)
  const rmPost = useReducer(reducers.rm_post)

  const handleCreate = async () => {
    await createPost({
      title: 'New post',
      content: 'Write something here...',
      published: false,
    })
  }

  const handlePublish = async (id: number, expectedUpdatedAt: Date) => {
    await updatePost({
      id,
      published: true,
      expectedUpdatedAt,
    })
  }

  const handleDelete = async (id: number) => {
    await rmPost({ id })
  }

  if (!isReady) return <div>Connecting...</div>

  return (
    <div>
      <p>{totalCount} posts</p>
      <button onClick={handleCreate}>New post</button>
      <ul>
        {data.map(post => (
          <li key={post.id}>
            <strong>{post.title}</strong>
            <span>{post.published ? 'Published' : 'Draft'}</span>
            <button onClick={() => handlePublish(post.id, post.updatedAt)}>
              Publish
            </button>
            <button onClick={() => handleDelete(post.id)}>Delete</button>
          </li>
        ))}
      </ul>
      {hasMore && <button onClick={loadMore}>Load more</button>}
    </div>
  )
}

export default BlogApp
```

## What just happened

- `betterspace()` generated three reducers for `post`: `create_post`, `update_post`,
  `rm_post`
- `betterspace()` generated `get_profile` and `upsert_profile` for the singleton
- `spacetime publish` compiled and deployed the module
- `spacetime generate` created typed bindings from the deployed module
- `useTable` opened a WebSocket subscription, receiving all rows and live updates
- `useReducer` calls reducers on the server, which update the database and push changes
  to all subscribers
- `useList` handles client-side sorting and pagination over the subscription data

Updates from any client appear in all connected clients within ~39ms (local Docker).

## TypeScript type inference

betterspace exports utility types that derive TypeScript types directly from your schema
brands. No manual type duplication needed.

```typescript
import type { InferRow, InferCreate, InferUpdate } from 'betterspace/server'

// Derive types from your schema
type PostRow = InferRow<typeof postSchema>     // full row with _id, updatedAt, userId
type PostCreate = InferCreate<typeof postSchema> // create args (all required)
type PostUpdate = InferUpdate<typeof postSchema> // update args (all optional)

// Use in component props
const PostCard = ({ post }: { post: PostRow }) => <h2>{post.title}</h2>
```

For reducer types:

```typescript
import type { InferReducerArgs, InferReducerReturn } from 'betterspace/server'
import { reducers } from '@/generated/module_bindings'

type CreateArgs = InferReducerArgs<typeof reducers.create_post>
type CreateReturn = InferReducerReturn<typeof reducers.create_post>
```

See [API reference](./api-reference.md#inferrow-infercreate-inferupdate) for the full
type reference.

## Next steps

- [Data fetching](./data-fetching.md) for filtering, pagination, and SSR
- [Forms](./forms.md) for Zod validation and form integration
- [API reference](./api-reference.md) for all factories and hooks
- [Deployment](./deployment.md) to push to Maincloud or self-host
