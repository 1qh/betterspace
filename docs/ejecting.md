# Ejecting from betterspace

If you outgrow betterspace or want full control over your SpacetimeDB module, you can
eject to raw SpacetimeDB SDK code.
The generated bindings stay intact.
Only the server-side factory layer is replaced.

## What betterspace provides

The factories (`makeCrud`, `makeOrgCrud`, etc.)
generate reducer definitions.
Ejecting means writing those reducers manually instead of using the factories.

The client-side hooks (`useList`, `usePresence`, `useUpload`) are independent utilities.
You can keep using them after ejecting from the server factories.

## Step 1: understand what the factories generate

For a `makeCrud` call like:

```typescript
const postCrud = makeCrud(spacetimedb, {
  fields: { title: t.string(), content: t.string(), published: t.bool() },
  idField: t.u32(),
  pk: tbl => tbl.id,
  table: db => db.post,
  tableName: 'post'
})
```

The factory generates these three reducers:

```typescript
// create_post
spacetimedb.reducer(
  { name: 'create_post' },
  { title: t.string(), content: t.string(), published: t.bool() },
  (ctx, args) => {
    ctx.db.post.insert({
      id: 0,
      title: args.title,
      content: args.content,
      published: args.published,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    })
  }
)

// update_post
spacetimedb.reducer(
  { name: 'update_post' },
  {
    id: t.u32(),
    title: t.string().optional(),
    content: t.string().optional(),
    published: t.bool().optional()
  },
  (ctx, args) => {
    const post = ctx.db.post.id.find(args.id)
    if (!post) throw new SenderError('NOT_FOUND: post:update')
    if (!post.userId.isEqual(ctx.sender))
      throw new SenderError('FORBIDDEN: post:update')
    ctx.db.post.id.update({
      ...post,
      ...(args.title !== undefined && { title: args.title }),
      ...(args.content !== undefined && { content: args.content }),
      ...(args.published !== undefined && { published: args.published }),
      updatedAt: ctx.timestamp
    })
  }
)

// rm_post
spacetimedb.reducer({ name: 'rm_post' }, { id: t.u32() }, (ctx, { id }) => {
  const post = ctx.db.post.id.find(id)
  if (!post) throw new SenderError('NOT_FOUND: post:rm')
  if (!post.userId.isEqual(ctx.sender))
    throw new SenderError('FORBIDDEN: post:rm')
  ctx.db.post.id.delete(id)
})
```

## Step 2: replace factory calls with manual reducers

In your module file, replace:

```typescript
// Before (with betterspace)
import { makeCrud } from 'betterspace/server'

const postCrud = makeCrud(spacetimedb, {
  /* config */
})

const reducers = spacetimedb.exportGroup({
  ...postCrud.exports
})
```

With:

```typescript
// After (raw SpacetimeDB)
import { SenderError } from 'spacetimedb/server'

const createPost = spacetimedb.reducer(
  { name: 'create_post' },
  { title: t.string(), content: t.string(), published: t.bool() },
  (ctx, args) => {
    ctx.db.post.insert({
      id: 0,
      title: args.title,
      content: args.content,
      published: args.published,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    })
  }
)

const updatePost = spacetimedb.reducer(
  { name: 'update_post' },
  {
    id: t.u32(),
    title: t.string().optional(),
    content: t.string().optional(),
    published: t.bool().optional()
  },
  (ctx, args) => {
    const post = ctx.db.post.id.find(args.id)
    if (!post) throw new SenderError('NOT_FOUND: post:update')
    if (!post.userId.isEqual(ctx.sender))
      throw new SenderError('FORBIDDEN: post:update')
    ctx.db.post.id.update({
      ...post,
      ...(args.title !== undefined && { title: args.title }),
      ...(args.content !== undefined && { content: args.content }),
      ...(args.published !== undefined && { published: args.published }),
      updatedAt: ctx.timestamp
    })
  }
)

const rmPost = spacetimedb.reducer(
  { name: 'rm_post' },
  { id: t.u32() },
  (ctx, { id }) => {
    const post = ctx.db.post.id.find(id)
    if (!post) throw new SenderError('NOT_FOUND: post:rm')
    if (!post.userId.isEqual(ctx.sender))
      throw new SenderError('FORBIDDEN: post:rm')
    ctx.db.post.id.delete(id)
  }
)

const reducers = spacetimedb.exportGroup({
  create_post: createPost,
  update_post: updatePost,
  rm_post: rmPost
})
```

## Step 3: remove betterspace dependency from the module

```bash
# In your SpacetimeDB module package
bun remove betterspace
```

Update imports in your module file:

```typescript
// Remove
import { makeCrud, makeOrgCrud } from 'betterspace/server'

// Keep (these are SpacetimeDB SDK imports)
import { schema, t, table, SenderError } from 'spacetimedb/server'
```

## Step 4: keep or remove client-side utilities

The client-side hooks (`useList`, `usePresence`, `useUpload`, etc.)
are independent of the server factories.
You can keep using them:

```typescript
// These still work after ejecting from server factories
import { useList, usePresence, useUpload } from 'betterspace/react'
import { zodFromTable } from 'betterspace'
```

If you want to remove betterspace entirely from the client too, replace:

- `useList` with your own filtering/pagination logic
- `usePresence` with direct `useTable` + `useReducer` calls
- `useUpload` with a custom XHR upload implementation
- `zodFromTable` with manually written Zod schemas

## Step 5: republish and regenerate

```bash
spacetime publish my-app --module-path packages/be/spacetimedb/
spacetime generate --lang typescript --module-path packages/be/spacetimedb/ --out-dir packages/be/spacetimedb/module_bindings/
```

The generated bindings are identical whether you used betterspace factories or wrote
reducers manually. The reducer names (`create_post`, `update_post`, `rm_post`) are what
matter, not how they were defined.

## What you lose by ejecting

- Automatic ownership checks (you write them manually)
- Conflict detection via `expectedUpdatedAt` (you implement it)
- Soft delete support (you implement it)
- Lifecycle hooks (you inline the logic)
- Future betterspace improvements (you’re on your own)

## What you gain

- Full control over reducer logic
- No dependency on betterspace’s internal types
- Ability to deviate from the standard CRUD pattern
