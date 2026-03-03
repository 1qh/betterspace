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

Create a new project manually (a `bun create betterspace` template is coming):

```bash
mkdir my-app && cd my-app
bun init -y
bun add betterspace spacetimedb
bun add -d typescript @types/bun
```

For a Next.js frontend:

```bash
bun add next react react-dom
bun add -d @types/react @types/react-dom
```

## Start the local backend

The Docker Compose file starts SpacetimeDB (port 3000) and MinIO for file storage (port 9000):

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

Create `packages/be/spacetimedb/src/index.ts`. This is your SpacetimeDB module, the server-side code that runs inside the database.

```typescript
import {
  makeCrud,
  makeSingletonCrud,
} from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

// Define tables
const post = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    title: t.string(),
    content: t.string(),
    published: t.bool().index(),
    updatedAt: t.timestamp(),
    userId: t.identity().index(),
  }
),

profile = table(
  { public: true },
  {
    displayName: t.string(),
    bio: t.string().optional(),
    updatedAt: t.timestamp(),
    userId: t.identity().index(),
  }
),

// Compose into a schema
spacetimedb = schema({ post, profile }),

// Generate CRUD reducers
postCrud = makeCrud(spacetimedb, {
  expectedUpdatedAtField: t.timestamp(),
  fields: {
    title: t.string(),
    content: t.string(),
    published: t.bool(),
  },
  idField: t.u32(),
  pk: tbl => tbl.id,
  table: db => db.post,
  tableName: 'post',
}),

profileCrud = makeSingletonCrud(spacetimedb, {
  fields: {
    displayName: t.string(),
    bio: t.string().optional(),
  },
  table: db => db.profile,
  tableName: 'profile',
}),

// Export all reducers
reducers = spacetimedb.exportGroup({
  ...postCrud.exports,
  ...profileCrud.exports,
})

export { reducers }
export default spacetimedb
```

## Publish the module

```bash
spacetime publish my-app --module-path packages/be/spacetimedb/
```

This compiles your TypeScript module and deploys it to the local SpacetimeDB instance. The module name (`my-app`) is what clients connect to.

## Generate TypeScript bindings

```bash
spacetime generate \
  --lang typescript \
  --module-path packages/be/spacetimedb/ \
  --out-dir packages/be/spacetimedb/module_bindings/
```

This generates typed client code from your module. Re-run this whenever you change the schema.

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
import { DbConnection } from '@/generated/module_bindings'

const SPACETIMEDB_URL = process.env.NEXT_PUBLIC_SPACETIMEDB_URL ?? 'ws://localhost:3000'
const MODULE_NAME = process.env.NEXT_PUBLIC_MODULE_NAME ?? 'my-app'

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <SpacetimeDBProvider
    uri={SPACETIMEDB_URL}
    module={MODULE_NAME}
    createConnection={() => DbConnection.builder()}
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

Here's a complete working component with create, update, and delete:

```typescript
'use client'

import { useReducer, useTable } from 'spacetimedb/react'
import { reducers, tables } from '@/generated/module_bindings'
import { useList } from 'betterspace/react'

const BlogApp = () => {
  const [posts, isReady] = useTable(tables.post)
  const { data, hasMore, loadMore, totalCount } = useList(posts, isReady, {
    sort: { field: 'updatedAt', direction: 'desc' },
    pageSize: 20,
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

- `makeCrud` generated three reducers: `create_post`, `update_post`, `rm_post`
- `makeSingletonCrud` generated `get_profile` and `upsert_profile`
- `spacetime publish` compiled and deployed the module
- `spacetime generate` created typed bindings from the deployed module
- `useTable` opened a WebSocket subscription, receiving all rows and live updates
- `useReducer` calls reducers on the server, which update the database and push changes to all subscribers
- `useList` handles client-side sorting and pagination over the subscription data

Updates from any client appear in all connected clients within ~39ms (local Docker).

## Next steps

- [Data fetching](./data-fetching.md) for filtering, pagination, and SSR
- [Forms](./forms.md) for Zod validation and form integration
- [API reference](./api-reference.md) for all factories and hooks
- [Deployment](./deployment.md) to push to Maincloud or self-host
