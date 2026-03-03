# betterspace

TypeScript CRUD library for SpacetimeDB. Maximum typesafety, thin consumer code.

Forked from [lazyconvex](https://github.com/1qh/lazyconvex) and migrated to SpacetimeDB as the backend.

---

## What it does

You define a Zod schema. betterspace generates a complete fullstack CRUD layer: server reducers, React hooks, form components, file upload handlers, real-time subscriptions, and org multi-tenancy. One schema, zero boilerplate.

## Factory types

| Factory | What it generates |
|---------|------------------|
| `crud()` | `list`, `read`, `create`, `update`, `rm`, `bulkCreate`, `bulkRm`, `bulkUpdate` |
| `orgCrud()` | All of `crud()` plus ACL: `addEditor`, `removeEditor`, `setEditors`, `editors` |
| `singletonCrud()` | `get`, `upsert` for single-row tables |
| `cacheCrud()` | `get`, `all`, `list`, `create`, `update`, `rm`, `invalidate`, `purge`, `load`, `refresh` |
| `orgFns()` | Full org management: membership, invites, join requests, ownership transfer |

## Features

- Real-time subscriptions via SpacetimeDB WebSocket protocol
- Org multi-tenancy with ACL out of the box
- File uploads with S3-compatible storage
- Zod bridge: schema types flow end-to-end with full inference
- Soft delete with `restore`
- Rate limiting
- Pagination
- Seed utilities for test data

## Quick start

### 1. Start SpacetimeDB

```bash
docker compose up -d
bun spacetime:up
```

### 2. Define your schema

```ts
import { z } from 'zod'
import { crud } from 'betterspace/server'

const postSchema = z.object({
  title: z.string(),
  body: z.string(),
})

export const post = crud('post', postSchema)
```

### 3. Publish the module

```bash
bun spacetime:publish
```

### 4. Connect from React

```tsx
import { useList } from 'betterspace/react'
import { post } from '@a/be'

const Posts = () => {
  const posts = useList(post)
  return (
    <ul>
      {posts.map(p => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  )
}
```

## Export entry points

```ts
import { ... } from 'betterspace'                // core types and utilities
import { ... } from 'betterspace/server'         // server reducers and factory functions
import { ... } from 'betterspace/zod'            // Zod bridge utilities
import { ... } from 'betterspace/retry'          // retry logic
import { ... } from 'betterspace/schema'         // schema helpers
import { ... } from 'betterspace/react'          // React hooks
import { ... } from 'betterspace/components'     // form and UI components
import { ... } from 'betterspace/eslint'         // ESLint config helpers
import { ... } from 'betterspace/next'           // Next.js integration
import { ... } from 'betterspace/test'           // test utilities
import { ... } from 'betterspace/test/discover'  // test discovery
import { ... } from 'betterspace/seed'           // seed utilities
```

## Demo apps

Four real-world web apps live in `apps/` to show betterspace in production use:

| App | Port | What it demonstrates |
|-----|------|---------------------|
| `apps/movie` | 3001 | Public catalog, caching, TMDB integration |
| `apps/blog` | 3002 | Org-scoped content, soft delete, ACL |
| `apps/chat` | 3003 | Real-time subscriptions, AI streaming |
| `apps/org` | 3004 | Full org management, invites, join requests |

## Development

```bash
bun install
bun spacetime:up          # start SpacetimeDB via Docker
bun spacetime:publish     # compile and publish the module
bun dev:web <app-name>    # start an app + backend watcher
bun test:all              # run all tests in parallel
bun fix                   # format, lint, typecheck
```

### SpacetimeDB scripts

```bash
bun spacetime:up          # start Docker + register local server
bun spacetime:down        # stop Docker
bun spacetime:publish     # publish module to local server
bun spacetime:generate    # regenerate TypeScript bindings
bun spacetime:logs        # tail SpacetimeDB logs
bun spacetime:sql         # open SQL shell
bun spacetime:reset       # wipe data and restart
bun spacetime:health      # check if server is up
```

## Requirements

- Bun 1.3+
- Docker (for SpacetimeDB)
- Node 20+ (for Next.js apps)

## License

MIT
