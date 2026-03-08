# API Reference

## Server factories

The primary API is `betterspace()` + `table()`, imported from `betterspace/server`.
Define your schema with `schema()` from `betterspace/schema`, then pass each schema
entry to `table()` inside `betterspace()`. All CRUD reducers are generated
automatically.

```typescript
import { betterspace } from 'betterspace/server'
import { s } from '../t'

export default betterspace(({ table }) => ({
  blog: table(s.blog, { pub: 'published' }),
  profile: table(s.profile),
  project: table(s.project),
  team: table(s.team, { unique: ['slug'] }),
  movie: table(s.movie, { key: 'tmdbId' }),
  message: table(s.message)
}))
```

The low-level factories (`makeCrud`, `makeOrgCrud`, `makeSingletonCrud`,
`makeCacheCrud`, `makeChildCrud`) are internal implementations that `betterspace()`
calls under the hood.
They remain available for advanced use cases but you rarely need them directly.

### table(s.ownedSchema) — user-owned tables

`table(s.ownedSchema)` generates `create`, `update`, and `rm` reducers for a user-owned
table. Define the schema with `schema({ owned: { ... } })`.

**Generated reducers:**

| Reducer              | Parameters                                          | Description                                                                                     |
| -------------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `create_{tableName}` | All fields                                          | Insert a row. Sets `userId = ctx.sender`, `updatedAt = ctx.timestamp`, `id = 0` (auto-inc).     |
| `update_{tableName}` | `id`, optional fields, optional `expectedUpdatedAt` | Update a row. Caller must be the owner. Throws `CONFLICT` if `expectedUpdatedAt` doesn’t match. |
| `rm_{tableName}`     | `id`                                                | Delete a row (or soft-delete if `softDelete: true`). Caller must be the owner.                  |

**Ownership:** All write operations check `row.userId === ctx.sender`. Non-owners get a
`FORBIDDEN` error.

**Options:**

| Option       | Description                                                                                   |
| ------------ | --------------------------------------------------------------------------------------------- |
| `index`      | Fields to index (pub field is auto-indexed when specified)                                    |
| `unique`     | Fields with a unique constraint                                                               |
| `pub`        | RLS pub field. Auto-indexes the field. See [Security](security.md)                            |
| `softDelete` | When `true`, `rm_*` sets `deletedAt` instead of deleting. Auto-injects the `deletedAt` field. |
| `rateLimit`  | Rate limit: `number` (max per minute) or `{ max, window }` for custom window                  |

---

### table(s.orgScopedSchema) — org-scoped tables

`table(s.orgScopedSchema)` generates org-scoped CRUD reducers that check org membership
before writes.
Define the schema with `schema({ orgScoped: { ... } })`. Cascade delete is
enabled by default — org-scoped rows are automatically removed when the org is deleted.
Opt out with `cascade: false`.

**Generated reducers:**

| Reducer              | Parameters            | Description                                                 |
| -------------------- | --------------------- | ----------------------------------------------------------- |
| `create_{tableName}` | `orgId`, all fields   | Insert a row. Requires org membership.                      |
| `update_{tableName}` | `id`, optional fields | Update a row. Requires org membership + ownership or admin. |
| `rm_{tableName}`     | `id`                  | Delete a row. Requires org membership + ownership or admin. |

---

### table(s.singletonSchema) — per-user singleton tables

`table(s.singletonSchema)` generates reducers for per-user singleton records (one row
per user, like a profile or settings).
Define the schema with `schema({ singleton: { ... } })`.

**Generated reducers:**

| Reducer              | Parameters                | Description                                                                            |
| -------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| `get_{tableName}`    | none                      | Throws `NOT_FOUND` if no row exists for the caller. Useful for triggering a read hook. |
| `upsert_{tableName}` | All fields (all optional) | Insert or update the caller’s row.                                                     |

---

### table(s.baseSchema, { key }) — cache/base tables

`table(s.baseSchema, { key: 'keyField' })` generates reducers for caching external data
(e.g., third-party API responses) with TTL-based expiration.
Define the schema with `schema({ base: { ... } })`.

**Generated reducers:**

| Reducer                  | Parameters                  | Description                                          |
| ------------------------ | --------------------------- | ---------------------------------------------------- |
| `create_{tableName}`     | `keyName` + all fields      | Insert a cache entry. Sets `cachedAt`, `updatedAt`.  |
| `update_{tableName}`     | `keyName` + optional fields | Update a cache entry. Clears `invalidatedAt`.        |
| `rm_{tableName}`         | `keyName`                   | Delete a cache entry.                                |
| `invalidate_{tableName}` | `keyName`                   | Mark an entry as invalidated (sets `invalidatedAt`). |
| `purge_{tableName}`      | none                        | Delete all entries older than TTL.                   |

Cache tables automatically get `cachedAt`, `invalidatedAt`, and `updatedAt` fields.

---

### table(s.childSchema) — child tables

`table(s.childSchema)` generates reducers for tables that belong to a parent row (e.g.,
messages in a chat).
Define the schema with `schema({ children: { message: child('chat', ...) } })`.

**Generated reducers:**

| Reducer              | Parameters                    | Description                                 |
| -------------------- | ----------------------------- | ------------------------------------------- |
| `create_{tableName}` | `foreignKeyName` + all fields | Insert a child row. Verifies parent exists. |
| `update_{tableName}` | `id` + optional fields        | Update a child row. Caller must be owner.   |
| `rm_{tableName}`     | `id`                          | Delete a child row. Caller must be owner.   |

---

### table(s.orgSchema) — org tables

`table(s.orgSchema)` generates the full suite of org management reducers.
Define the schema with `schema({ org: { ... } })`. See
[organizations](./organizations.md) for the full config reference.

---

### makePresence

Generates presence heartbeat, leave, and cleanup reducers.

```typescript
import { makePresence } from 'betterspace/server'

const presenceFns = makePresence(spacetimedb, {
  dataField: t.string(),
  roomIdField: t.string(),
  pk: tbl => tbl.id,
  table: db => db.presence,
  tableName: 'presence' // optional, defaults to 'presence'
})
```

**Generated reducers:**

| Reducer                          | Parameters                | Description                                         |
| -------------------------------- | ------------------------- | --------------------------------------------------- |
| `presence_heartbeat_{tableName}` | `roomId`, optional `data` | Upsert presence row. Requires authenticated sender. |
| `presence_leave_{tableName}`     | `roomId`                  | Delete presence row for the caller.                 |
| `presence_cleanup_{tableName}`   | none                      | Delete stale presence rows (older than TTL).        |

Constants: `HEARTBEAT_INTERVAL_MS = 15000`, `PRESENCE_TTL_MS = 30000`.

---

### makeFileUpload

Generates reducers for registering and deleting uploaded files.

```typescript
import { makeFileUpload } from 'betterspace/server'

const fileCrud = makeFileUpload(spacetimedb, {
  fields: {
    contentType: t.string(),
    filename: t.string(),
    size: t.number(),
    storageKey: t.string()
  },
  idField: t.u32(),
  namespace: 'file',
  pk: tbl => tbl.id,
  table: db => db.file,
  options: {
    maxFileSize: 10 * 1024 * 1024, // 10MB default
    allowedTypes: new Set(['image/jpeg', 'image/png', 'application/pdf'])
  }
})
```

**Generated reducers:**

| Reducer                       | Parameters                                      | Description                                         |
| ----------------------------- | ----------------------------------------------- | --------------------------------------------------- |
| `register_upload_{namespace}` | `contentType`, `filename`, `size`, `storageKey` | Record a completed upload. Validates type and size. |
| `delete_file_{namespace}`     | `fileId`                                        | Delete a file record. Caller must be owner.         |

---

### makeSchema

`makeSchema` is used internally by `betterspace()` to create table definition helpers
that automatically add system fields (`id`, `updatedAt`, `userId`, etc.). It uses
dependency injection to avoid `import.meta.require` issues in SpacetimeDB’s V8 runtime.
You don’t call it directly — `betterspace()` handles this for you.

The primary interface is the universal `table()` function, which auto-detects the table
type from the schema brand.
The specific helpers (`ownedTable`, `orgScopedTable`, etc.)
are still available as alternatives.

```typescript
import { makeSchema } from 'betterspace/server'
import { t, table } from 'spacetimedb/server'

const { table } = makeSchema({ t, table })
```

**`table()` — universal interface:**

`table()` detects the schema brand (`owned`, `org`, `orgDef`, `base`, `singleton`) and
applies the correct system fields automatically.
Child tables are detected by the `ChildLike` shape (`foreignKey`, `parent`, `schema`).
File tables use `table.file()`.

```typescript
const blog = table(owned.blog, { pub: 'published' })
const project = table(orgScoped.project)
const org = table(org.team, { unique: ['slug'] })
const profile = table(singleton.profile)
const message = table(children.message)
const movie = table(base.movie, { key: 'tmdbId' })
const file = table.file()
```

All tables are set `{ public: true }` by default.

**Options by table type:**

| Table type | Available options                                                                  |
| ---------- | ---------------------------------------------------------------------------------- |
| owned      | `index`, `unique`, `extra`, `softDelete`, `rateLimit`, `pub`                       |
| orgScoped  | `index`, `unique`, `extra`, `softDelete`, `rateLimit`, `cascade`, `indexes`, `pub` |
| org        | `index`, `unique`, `extra`                                                         |
| base/cache | `key`, `ttl`                                                                       |
| singleton  | none                                                                               |
| child      | none                                                                               |

**Read-side access control (`pub` option):**

The `pub` option controls Row-Level Security (RLS) via `clientVisibilityFilter`. See
[Security & Scalability](security.md) for full documentation.

```tsx
table(s.blog, { pub: 'published' }) // visible when published=true OR own row
table(s.chat, { pub: 'isPublic' }) // visible when isPublic=true OR own row
table(s.chat, { pub: true }) // fully public, no RLS filter
table(s.blog) // private — only own rows visible
```

**Specific helpers (backward-compatible alternatives):**

| Helper                               | System fields added                            | Signature             |
| ------------------------------------ | ---------------------------------------------- | --------------------- |
| `ownedTable(fields, opts?)`          | `id`, `updatedAt`, `userId`                    | User-owned table      |
| `orgScopedTable(fields, opts?)`      | `id`, `orgId`, `updatedAt`, `userId`           | Org-scoped table      |
| `orgTable(fields, opts?)`            | `id`, `updatedAt`, `userId` + org sub-tables   | Organization table    |
| `singletonTable(fields)`             | `updatedAt`, `userId`                          | One row per user      |
| `cacheTable(keyName, fields, opts?)` | `id`, `cachedAt`, `invalidatedAt`, `updatedAt` | External data cache   |
| `childTable(childDef)`               | `foreignKey`, `id`, `updatedAt`, `userId`      | Child of a parent row |

**`StdbDeps` interface** (what you pass to `makeSchema`):

```typescript
interface StdbDeps {
  t: {
    identity: () => { index: () => FieldBuilder }
    timestamp: () => FieldBuilder & { optional: () => FieldBuilder }
    u32: () => {
      autoInc: () => { primaryKey: () => FieldBuilder }
      index: () => FieldBuilder
    }
  }
  table: (...args: Parameters<typeof stdbTable>) => StdbTable
}
```

In practice, just pass `{ t, table }` from `spacetimedb/server`.

---

### setupCrud

`setupCrud` is a lower-level convenience wrapper superseded by `betterspace()` +
`table()`. The `betterspace()` API is simpler and handles all the same table types with
less boilerplate. `setupCrud` remains available for backward compatibility.

---

## React hooks

All hooks are imported from `betterspace/react`.

### useList

Client-side filtering, sorting, and pagination over subscription data.

```typescript
import { useList } from 'betterspace/react'

const { data, hasMore, isLoading, loadMore, page, totalCount } = useList(
  rows, // T[] from useTable
  isReady, // boolean from useTable
  {
    where: {
      published: true,
      category: 'tech',
      or: [{ category: 'news' }]
    },
    sort: { field: 'updatedAt', direction: 'desc' },
    search: { query: 'hello', fields: ['title', 'content'] },
    pageSize: 20,
    page: 1 // controlled (optional)
  }
)
```

**`'skip'` sentinel:**

Pass `'skip'` as the options argument to disable execution.
The hook returns a loading state with empty data and does not filter or paginate.

```typescript
const list = useList(
  rows,
  ready,
  someCondition ? { where: { published: true } } : 'skip'
)
```

**Auto-reset pagination:**

When `where` or `search.query` changes, `useList` automatically resets to page 1. This
prevents stale pagination state when filters change.

**Type-safe `where`:**

The `where` option is generic over `T` — field names are checked against the row type at
compile time:

```typescript
useList(blogs, ready, { where: { publishd: true } }) // TS error: 'publishd' doesn't exist
useList(blogs, ready, { where: { published: true } }) // OK
useList(items, ready, { where: { price: { $gt: 10 } } }) // OK
```

**`search.debounceMs`:**

Pass `debounceMs` inside the `search` option to debounce the search query.
The filter only re-runs after the user stops typing for the specified number of
milliseconds.

```typescript
useList(posts, isReady, {
  search: { query: searchInput, fields: ['title', 'content'], debounceMs: 300 }
})
```

**Return value:**

| Field        | Type         | Description                           |
| ------------ | ------------ | ------------------------------------- |
| `data`       | `T[]`        | Current page of filtered, sorted rows |
| `hasMore`    | `boolean`    | Whether more rows exist               |
| `isLoading`  | `boolean`    | `true` until `isReady` is `true`      |
| `loadMore`   | `() => void` | Load the next page                    |
| `page`       | `number`     | Current page number                   |
| `totalCount` | `number`     | Total filtered row count              |

---

### useOwnRows

Computes an `own` boolean on each row using a predicate function.
Pass `null` or `undefined` when the current user’s identity is not yet known — all rows
will have `own: false`.

```typescript
import { useOwnRows } from 'betterspace/react'

const blogs = useOwnRows(
  allBlogs,
  identity ? b => b.userId.isEqual(identity) : null
)
```

**Signature:**

```typescript
useOwnRows = <T extends Record<string, unknown>>(
  rows: readonly T[],
  isOwn: ((row: T) => boolean) | null | undefined
): (T & { own: boolean })[]
```

The returned rows are memoized.
Combine with `useList` and `where: { own: true }` to show only the current user’s rows:

```typescript
const ownedBlogs = useOwnRows(
  allBlogs,
  identity ? b => b.userId.isEqual(identity) : null
)
const { data } = useList(ownedBlogs, isReady, { where: { own: true } })
```

---

### usePresence

Manages presence state with heartbeat and TTL-based cleanup.

```typescript
import { usePresence } from 'betterspace/react'
import { useTable, useReducer } from 'spacetimedb/react'
import { tables, reducers } from '@/generated/module_bindings'

const [presenceRows, isReady] = useTable(tables.presence)
const heartbeat = useReducer(reducers.presence_heartbeat_presence)

const { users, updatePresence } = usePresence(
  presenceRows,
  async () =>
    heartbeat({
      roomId: 'main',
      data: JSON.stringify({ cursor: { x: 0, y: 0 } })
    }),
  {
    enabled: true,
    heartbeatIntervalMs: 15_000,
    ttlMs: 30_000
  }
)

// Update presence data (triggers a heartbeat)
updatePresence({ cursor: { x: 100, y: 200 } })
```

**Return value:**

| Field            | Type                                      | Description                             |
| ---------------- | ----------------------------------------- | --------------------------------------- |
| `users`          | `PresenceRow[]`                           | Active users (filtered by TTL)          |
| `updatePresence` | `(data: Record<string, unknown>) => void` | Update presence data and send heartbeat |

---

### useUpload

Handles file upload with progress tracking and pre-signed URL flow.

```typescript
import { useUpload } from 'betterspace/react'

const { upload, isUploading, progress, error, url } = useUpload({
  apiEndpoint: '/api/upload/presign', // default
  getPresignedUrl: async file => {
    /* custom presign logic */
  },
  registerFile: async ({ contentType, filename, size, storageKey }) => {
    // Called after upload succeeds
    return { storageId: storageKey, url: undefined }
  }
})

const result = await upload(file, { signal: abortController.signal })
// result: { ok: true, storageId, url? } | { ok: false, code: 'ABORTED' | 'NETWORK' | 'URL' | 'HTTP' }
```

---

### useInfiniteList

Like `useList` but designed for infinite scroll with intersection observer integration.
Accepts the same type-safe `where` option as `useList`. Supports the `search` option
with `debounceMs`. When `where` or `search.query` changes, the visible count resets to
`batchSize` automatically.

Pass `'skip'` as the options argument to disable execution:

```typescript
const list = useInfiniteList(
  rows,
  ready,
  someCondition ? { batchSize: 20 } : 'skip'
)
```

```typescript
import { useInfiniteList } from 'betterspace/react'

const { data, hasMore, loadMore, totalCount } = useInfiniteList(rows, isReady, {
  batchSize: 20,
  sort: { updatedAt: 'desc' },
  where: { published: true },
  search: { query: searchInput, fields: ['title', 'content'], debounceMs: 300 }
})
```

**Options (`InfiniteListOptions<T>`):**

| Option      | Type                             | Description                             |
| ----------- | -------------------------------- | --------------------------------------- |
| `batchSize` | `number`                         | Items to load per batch (default: 50)   |
| `sort`      | `ListSort<T>`                    | Sort field and direction                |
| `where`     | `ListWhere<T>`                   | Filter predicate                        |
| `search`    | `{ query, fields, debounceMs? }` | Full-text search with optional debounce |

---

### useSearch

Client-side full-text search over subscription data.

```typescript
import { useSearch } from 'betterspace/react'

const results = useSearch(posts, query, {
  fields: ['title', 'content']
})
```

Pass `'skip'` as the options argument to disable execution:

```typescript
const results = useSearch(
  posts,
  ready,
  someCondition ? { query, fields: ['title'] } : 'skip'
)
```

---

### useCacheEntry

Manages a single cache entry with automatic stale detection and refresh.
Designed for use with cache tables (defined via `schema({ base: { ... } })`) where
entries may become stale.

```typescript
import { useCacheEntry } from 'betterspace/react'

const { data, isLoading, isStale, refresh } = useCacheEntry({
  args: { tmdbId: movieId },
  data: cachedMovie,
  load: async args => {
    await loadMovie(args)
  },
  table: 'movie'
})
```

**Options (`UseCacheEntryOptions<A, T>`):**

| Option  | Type                         | Description                                                       |
| ------- | ---------------------------- | ----------------------------------------------------------------- |
| `args`  | `A`                          | Arguments passed to the `load` function                           |
| `data`  | `null \| T \| undefined`     | Current cached data (`undefined` = not yet loaded, `null` = miss) |
| `load`  | `(args: A) => Promise<void>` | Function to refresh the cache entry                               |
| `table` | `string`                     | Table name for devtools tracking                                  |

**Return value (`UseCacheEntryResult<T>`):**

| Field       | Type         | Description                             |
| ----------- | ------------ | --------------------------------------- |
| `data`      | `null \| T`  | Cached data, or `null` if not loaded    |
| `isLoading` | `boolean`    | `true` while loading or refreshing      |
| `isStale`   | `boolean`    | `true` when the entry has `stale: true` |
| `refresh`   | `() => void` | Manually trigger a refresh              |

---

### useBulkSelection

Multi-select state management for list UIs.

```typescript
import { useBulkSelection } from 'betterspace/react'

const { selected, toggle, toggleAll, clear, isSelected, isAllSelected, count } =
  useBulkSelection(posts.map(p => p.id))
```

---

### useBulkMutate

Run a reducer against multiple rows, collecting results and calling a callback when all
settle.

```typescript
import { useBulkMutate } from 'betterspace/react'

const bulk = useBulkMutate(removeTask, {
  onSuccess: count => toast(`${count} deleted`),
  onSettled: result => {
    // Called once all items have settled
    console.log(result.errors, result.results)
  }
})
bulk.run([{ id: 1 }, { id: 2 }, { id: 3 }])
```

**`onSettled` signature:** `(result: BulkResult<unknown>) => void`

`BulkResult` contains `errors`, `results`, and `settled` (raw `PromiseSettledResult[]`).

**Options:**

| Option       | Type                                    | Description                                                                     |
| ------------ | --------------------------------------- | ------------------------------------------------------------------------------- |
| `onError`    | `((error: unknown) => void) \| false`   | Called if any mutation fails. Pass `false` to suppress the default error toast. |
| `onProgress` | `(progress: BulkProgress) => void`      | Called after each item settles with live progress counts                        |
| `onSettled`  | `(result: BulkResult<unknown>) => void` | Called once all items have settled                                              |
| `onSuccess`  | `(count: number) => void`               | Called when all mutations succeed                                               |

**`BulkProgress` type:**

```typescript
interface BulkProgress {
  failed: number
  pending: number
  succeeded: number
  total: number
}
```

**Return value:**

| Field       | Type                                     | Description                               |
| ----------- | ---------------------------------------- | ----------------------------------------- |
| `isPending` | `boolean`                                | `true` while any item is still in flight  |
| `progress`  | `BulkProgress \| null`                   | Live progress counts, or `null` when idle |
| `run`       | `(items: A[]) => Promise<BulkResult<R>>` | Start the bulk operation                  |

Use `progress` to render a progress bar:

```typescript
const bulk = useBulkMutate(removeTask, {
  onProgress: p => console.log(`${p.succeeded}/${p.total} done`),
  onSuccess: count => toast(`${count} deleted`)
})

bulk.run(selectedIds.map(id => ({ id })))

// bulk.progress: { total: 3, succeeded: 1, failed: 0, pending: 2 }
```

---

### useSoftDelete

Wraps a delete+restore reducer pair with an undo toast pattern.
When the user deletes an item, a toast appears with an “Undo” action that restores it.

```typescript
import { useSoftDelete } from 'betterspace/react'

const { remove } = useSoftDelete({
  rm: removeWiki,
  restore: restoreWiki,
  toast: toast,
  label: 'Wiki page',
  undoMs: 5000
})

await remove({ id: wikiId })
```

**Options (`SoftDeleteOpts<A>`):**

| Option      | Type                            | Default  | Description                           |
| ----------- | ------------------------------- | -------- | ------------------------------------- |
| `rm`        | `(args: A) => Promise<unknown>` | required | Delete reducer                        |
| `restore`   | `(args: A) => Promise<unknown>` | required | Restore reducer                       |
| `toast`     | `ToastFn`                       | required | Toast function with action support    |
| `label`     | `string`                        | `'Item'` | Display name for toast messages       |
| `undoMs`    | `number`                        | `5000`   | Duration the undo toast stays visible |
| `onError`   | `(error: unknown) => void`      | —        | Called if restore fails               |
| `onRestore` | `() => void`                    | —        | Called after successful restore       |

**Return value:**

| Field    | Type                         | Description            |
| -------- | ---------------------------- | ---------------------- |
| `remove` | `(args: A) => Promise<void>` | Delete with undo toast |

---

### useMutate

Wraps a mutation function with optimistic updates, devtools tracking, and toast errors.

```typescript
import { useMutate } from 'betterspace/react'

const save = useMutate(updatePost, { optimistic: true })
await save({ id: 1, title: 'Updated' })
```

**`onSuccess` and `onSettled` callbacks:**

```typescript
const save = useMutate(updatePost, {
  onSuccess: (result, args) => {
    // Called when the mutation resolves successfully
    router.push(`/posts/${args.id}`)
  },
  onSettled: (args, error, result) => {
    // Called after every mutation, success or failure
    setSubmitting(false)
  }
})
```

**`onSuccess` signature:** `(result: R, args: A) => void` **`onSettled` signature:**
`(args: A, error: unknown, result?: R) => void`

`onSettled` always fires.
When the mutation fails, `error` is the thrown value and `result` is `undefined`.

**Options (`MutateOptions<A, R>`):**

| Option       | Type                                            | Description                                                                           |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `getName`    | `(args: A) => string`                           | Custom name for devtools tracking                                                     |
| `onError`    | `((error: unknown) => void) \| false`           | Override or suppress the default error toast                                          |
| `onSettled`  | `(args: A, error: unknown, result?: R) => void` | Called after every mutation                                                           |
| `onSuccess`  | `(result: R, args: A) => void`                  | Called when the mutation succeeds                                                     |
| `optimistic` | `boolean`                                       | Enable optimistic updates (default: `true`)                                           |
| `resolveId`  | `(args: A) => string \| undefined`              | Resolve the row ID for optimistic reconciliation                                      |
| `retry`      | `number \| RetryOptions`                        | Retry on failure. A number sets `maxAttempts`. An object gives full control.          |
| `toast`      | `MutateToast<A, R>`                             | Toast shorthand — show success/error messages without `onSuccess`/`onError` callbacks |
| `type`       | `MutationType`                                  | Override the detected mutation type (`'create'`, `'update'`, or `'delete'`)           |

**`MutateToast<A, R>`:**

```typescript
interface MutateToast<A extends Record<string, unknown>, R = void> {
  error?: ((error: unknown) => string) | string
  fieldErrors?: boolean
  success?: ((result: R, args: A) => string) | string
}
```

Pass `toast` to show success/error toasts without writing `onSuccess`/`onError`
callbacks. `fieldErrors` defaults to `true` — field validation errors are toasted before
the generic `error` message.
`onSuccess` and `toast.success` compose: both run when provided.

**`retry` with `RetryOptions`:**

```typescript
import type { RetryOptions } from 'betterspace/retry'

const save = useMutate(updatePost, {
  retry: 3
})

const saveWithBackoff = useMutate(updatePost, {
  retry: {
    maxAttempts: 5,
    initialDelayMs: 200,
    maxDelayMs: 5_000,
    base: 2
  }
})
```

**`RetryOptions` type:**

```typescript
interface RetryOptions {
  base?: number
  initialDelayMs?: number
  maxAttempts?: number
  maxDelayMs?: number
}
```

Defaults: `maxAttempts: 3`, `initialDelayMs: 500`, `maxDelayMs: 10_000`, `base: 2`.
Retries use exponential backoff with jitter.
When all attempts fail, the thrown error includes the attempt count (e.g.
`"Connection refused (after 3 attempts)"`) and preserves the original error as `cause`
for debugging.

Options are validated at call time: `maxAttempts` must be >= 1, `initialDelayMs` and
`maxDelayMs` must be >= 0, and `base` must be >= 1. Invalid values throw immediately
with a descriptive error message.

---

### useMutation

Combines `useReducer` + `useMutate` into a single call with relaxed argument types.
Import from `betterspace/react`.

```typescript
import { useMutation } from 'betterspace/react'
```

**Signature:**

```typescript
const useMutation = <A extends Record<string, unknown>, R = void, D = unknown>(
  useReducerHook: (desc: D) => (args: A) => Promise<R>,
  reducer: D,
  options?: MutateOptions<A, R>
): ((args: UndefinedToOptional<A>) => Promise<R>)
```

The return type uses `UndefinedToOptional<A>` — fields typed as `T | undefined` in the
generated reducer args become optional and also accept `null` (SpacetimeDB serializes
both as `None`). You only need to pass required fields and any fields you want to
change:

```typescript
const save = useMutation(useReducer, reducers.updateBlog, {
  toast: { success: 'Saved', error: 'Save failed' }
})

save({ id: 1, title: 'New title' })
```

**Auto-inferred getName**: When no `getName` option is provided, `useMutation`
automatically extracts the name from the SpacetimeDB reducer descriptor’s `accessorName`
or `name` field. You only need explicit `getName` for dynamic names (e.g. template
literals with runtime IDs).

**Built-in field error toasting**: When `toast` is provided, field errors from
`SenderError` are automatically extracted and toasted before falling through to the
generic error message.
No manual `toastFieldError` try/catch needed in form `onSubmit` handlers.

Accepts the same `MutateOptions` as `useMutate`.

---

### relax

Wraps a raw `useReducer` call to apply `UndefinedToOptional` to its argument type.
Use when calling `useReducer` directly without `useMutation`.

**Signature:**

```typescript
const relax: <T extends (...args: unknown[]) => unknown>(
  fn: T
) => (...args: UndefinedToOptional<Parameters<T>[0]>[]) => ReturnType<T>
```

```typescript
import { relax } from 'betterspace/react'

const updateTask = relax(useReducer(reducers.updateTask))
updateTask({ id: 1, completed: true })
```

Without `relax`, SpacetimeDB-generated types require every field (even those accepting
`undefined`) to be explicitly passed:

```typescript
const updateTask = useReducer(reducers.updateTask)
updateTask({
  id: 1,
  completed: true,
  assigneeId: undefined,
  priority: undefined
})
```

`relax()` makes `T | undefined` fields optional at the type level.
At runtime, missing keys return `undefined` when SpacetimeDB’s serializer reads them,
which serializes as `None` — the same as explicitly passing `undefined`.

---

### useOptimisticMutation

Low-level optimistic mutation hook with rollback support.

```typescript
import { useOptimisticMutation } from 'betterspace/react'

const { execute, isPending, error } = useOptimisticMutation({
  mutate: updatePost,
  onOptimistic: args => {
    // Apply optimistic update to local state
  },
  onRollback: (args, err) => {
    // Revert optimistic update on failure
  },
  onSuccess: (result, args) => {
    // Called when mutation resolves
  },
  onSettled: (args, error, result) => {
    // Called after every mutation, success or failure
    setSubmitting(false)
  }
})
```

**`onSettled` signature:** `(args: A, error: unknown, result?: R) => void`

**Options (`OptimisticOptions<A, R>`):**

| Option         | Type                                            | Description                                          |
| -------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `mutate`       | `(args: A) => Promise<R>`                       | The mutation function to execute                     |
| `onOptimistic` | `(args: A) => void`                             | Called before the mutation to apply optimistic state |
| `onRollback`   | `(args: A, error: Error) => void`               | Called on failure to revert optimistic state         |
| `onSettled`    | `(args: A, error: unknown, result?: R) => void` | Called after every mutation                          |
| `onSuccess`    | `(result: R, args: A) => void`                  | Called when the mutation succeeds                    |

---

### useOnlineStatus

Tracks browser online/offline state.

```typescript
import { useOnlineStatus } from 'betterspace/react'

const isOnline = useOnlineStatus()
```

### useForm

Form state management hook that integrates Zod schemas with TanStack Form.
Provides auto-derived field labels, conflict detection, auto-save, and typed field
errors. See [Forms guide](forms.md) for full usage.

Two versions are available:

- **`betterspace/react`** — Base hook: form state, validation, conflict detection,
  auto-save. Use when building custom form UI.
- **`betterspace/components`** — Enhanced wrapper: adds navigation guards
  (`useWithGuard`) to prevent losing unsaved changes.
  Use with the built-in `<Form>` component and typed field components.

```typescript
import { useForm } from 'betterspace/react'

const form = useForm({
  schema: blogSchema,
  values: existingData,
  onSubmit: async data => {
    await save(data)
    return data
  }
})
```

### useFormMutation

Combines `useForm` with a mutation function for forms that submit via SpacetimeDB
reducers. Handles loading state, error toasts, and field validation automatically.

Two versions are available:

- **`betterspace/react`** — Base hook.
  No navigation guard.
  `resetOnSuccess` defaults to `false`.
- **`betterspace/components`** — Adds a navigation guard via `useWithGuard`.
  `resetOnSuccess` defaults to `true`.

The `M` generic types the mutation argument independently from the form schema.
Use `transform` to map validated form data into the shape the mutation expects.

```typescript
import { useFormMutation } from 'betterspace/react'

const form = useFormMutation({
  schema: blogSchema,
  mutate: api.blogs.create,
  toast: { success: 'Created', error: 'Failed' }
})
```

**Options:**

| Option           | Type                                       | Description                                                                                               |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `schema`         | `ZodObject`                                | Zod schema for validation and field metadata.                                                             |
| `mutate`         | `(args: M) => Promise<void>`               | Mutation function (e.g. from `useReducer`).                                                               |
| `toast`          | `{ success?: string; error?: string }`     | Built-in toast messages. `success` composes with `onSuccess`. `error` is used when no explicit `onError`. |
| `onSuccess`      | `() => void`                               | Called on success. Composes with `toast.success` (both run).                                              |
| `onError`        | `((e: unknown) => void) \| false`          | Error handler. Takes precedence over `toast.error`. Pass `false` to suppress all errors.                  |
| `transform`      | `(d: output<S>) => M`                      | Maps validated form data into mutation argument shape.                                                    |
| `values`         | `output<S>`                                | Initial form values. If omitted, schema defaults are used.                                                |
| `resetOnSuccess` | `boolean`                                  | Reset form after success. Default: `false` (react), `true` (components).                                  |
| `autoSave`       | `{ debounceMs: number; enabled: boolean }` | Auto-submit on change after debounce.                                                                     |
| `onConflict`     | `(data: ConflictData) => void`             | Handle concurrent edit conflicts.                                                                         |

With `transform` and `toast`:

```typescript
const form = useFormMutation({
  mutate: useReducer(reducers.createWiki),
  toast: { success: 'Created' },
  onSuccess: () => router.push('/wiki'),
  schema: wiki,
  transform: d => ({ ...d, orgId: Number(org._id) })
})
```

### Form component and field components

The `<Form>` component from `betterspace/components` renders a typed form with automatic
field layout. It accepts a `render` callback that receives typed field accessors:

```typescript
import { Form, useForm } from 'betterspace/components'

const form = useForm({ schema, values, onSubmit })

<Form form={form} render={f => (
  <>
    <f.Text name="title" />
    <f.Toggle name="published" />
    <f.Num name="rating" />
  </>
)} />
```

14 built-in field components: `Text`, `Num`, `Toggle`, `Datepick`, `Timepick`,
`Colorpick`, `Slider`, `Rating`, `Choose`, `Combobox`, `MultiSelect`, `File`, `Files`,
`Arr`. Each accepts the field name as a typed prop — misspelling a field name is a type
error.

---

## React utilities

### toastFieldError

Toasts the first field validation error from a Betterspace error.
Returns `true` if a field error was toasted, `false` otherwise.
Import from `betterspace/react`.

**Signature:**

```typescript
const toastFieldError = (error: unknown, toastFn: ToastFn): boolean
```

`ToastFn` is `(message: string) => void`.

```typescript
import { toastFieldError } from 'betterspace/react'

try {
  await save(data)
} catch (error) {
  if (!toastFieldError(error, toast.error)) {
    toast.error('Something went wrong')
  }
}
```

---

### makeErrorHandler

Creates a reusable error handler that toasts error messages with optional per-code
overrides.

```typescript
import { makeErrorHandler } from 'betterspace/react'

const handleError = makeErrorHandler(toast.error, {
  FORBIDDEN: () => toast.error('You do not have permission'),
  RATE_LIMITED: data =>
    toast.error(`Too many requests. Retry in ${data?.retryAfter}ms`)
})

try {
  await save(data)
} catch (error) {
  handleError(error)
}
```

**Signature:**

```typescript
makeErrorHandler = (
  toast: ToastFn,
  overrides?: Partial<Record<string, (data?: ErrorData) => void>>
) => (error: unknown) => void
```

When an error matches a code in `overrides`, that handler runs instead of the default
toast. For unmatched codes, the error message is toasted via the provided `toast`
function.

---

### useErrorToast

Creates a stable, memoized callback that toasts Betterspace errors with optional
per-code handlers. Ideal for use in React event handlers and mutation callbacks.
Import from `betterspace/react`.

**Signature:**

```typescript
const useErrorToast = (options: ErrorToastOptions) => (error: unknown) => void
```

```typescript
interface ErrorToastOptions {
  handlers?: Partial<Record<ErrorCode, (data: ErrorData) => void>> & {
    default?: (error: unknown) => void
  }
  toast: ToastFn
}
```

**Example:**

```typescript
import { useErrorToast } from 'betterspace/react'
import { toast } from 'sonner'

const Page = () => {
  const handleError = useErrorToast({ toast: toast.error })

  const onSubmit = async () => {
    try {
      await save(data)
    } catch (error) {
      handleError(error)
    }
  }
}
```

With per-code handlers:

```typescript
const handleError = useErrorToast({
  toast: toast.error,
  handlers: {
    NOT_AUTHENTICATED: () => router.push('/login'),
    FORBIDDEN: () => toast.error('No permission')
  }
})
```

When an error matches a code in `handlers`, that handler runs instead of the default
toast. For unmatched codes, the error message is toasted via the provided `toast`
function. The returned callback is referentially stable (memoized with `useCallback`).

---

### defaultOnError

The default mutation error handler used by all Betterspace mutation hooks (`useMutate`,
`useMutation`, `useOrgMutation`). Handles `NOT_AUTHENTICATED` and `RATE_LIMITED` errors
with user-friendly toasts, and falls back to toasting the error message for all other
codes. Import from `betterspace/react`.

**Signature:**

```typescript
const defaultOnError = (error: unknown) => void
```

**Behavior:**

| Error code          | Toast message                                                                                |
| ------------------- | -------------------------------------------------------------------------------------------- |
| `NOT_AUTHENTICATED` | “Please log in”                                                                              |
| `RATE_LIMITED`      | “Too many requests, retry in Xs” (with `retryAfter`) or “Too many requests, try again later” |
| Any other           | The error message from the response                                                          |

**Example — override for a single mutation:**

```typescript
import { defaultOnError, useMutate } from 'betterspace/react'

const save = useMutate(api.post.create, {
  onError: error => {
    // custom handling, then fall back
    if (isSpecialCase(error)) return handleSpecial(error)
    defaultOnError(error)
  }
})
```

---

## React components

### useOrgQuery

Wraps a query function and automatically injects `orgId` from the current org context.
Pass `'skip'` as the second argument to skip the query.

```typescript
import { useOrgQuery } from 'betterspace/react'

const projects = useOrgQuery(queryProject, { status: 'active' })
// → queryProject({ status: 'active', orgId: '<current-org-id>' })

const skipped = useOrgQuery(queryProject, 'skip')
// → undefined (query not executed)
```

See [organizations](./organizations.md) for full usage.

---

### createOrgHooks

Factory that returns typed org hooks bound to a specific org type and optional `orgId`
transform. Use when your org has extra fields beyond the base `OrgDoc`, or when you need
`orgId` coerced before injection.

**Signature:**

```typescript
createOrgHooks<O extends OrgDoc = OrgDoc, M = unknown>(config?: {
  orgIdForMutation?: (id: string) => unknown
}) => {
  useActiveOrg: () => { activeOrg: O | null; setActiveOrg: (org: O) => void }
  useMyOrgs: () => { orgs: O[] }
  useOrg: () => OrgContext<O>
  useOrgMutation: <A extends Record<string, unknown>>(
    mutation: (args: A) => Promise<unknown>
  ) => (mutationArgs?: Omit<A, 'orgId'>) => Promise<unknown>
}
```

```typescript
import { createOrgHooks } from 'betterspace/react'

const { useActiveOrg, useMyOrgs, useOrg, useOrgMutation } = createOrgHooks<
  Org & { _id: string }
>({
  orgIdForMutation: Number
})
```

`useOrgMutation` from the returned hooks applies `orgIdForMutation` when injecting
`orgId`:

```typescript
const update = useOrgMutation(useReducer(reducers.orgUpdate))
await update(d) // orgId auto-injected as Number(org._id)
```

When `orgIdForMutation` is omitted, `orgId` is passed as-is.

---

### OrgProvider

Provides org context to child components.
See [organizations](./organizations.md).

```typescript
import { OrgProvider } from 'betterspace/react'

<OrgProvider org={org} role="admin" membership={membership}>
  {children}
</OrgProvider>
```

### ErrorBoundary

Catches React render errors and displays a fallback UI. Accepts a `className` prop to
style the fallback container.

```typescript
import { ErrorBoundary } from 'betterspace/components'

<ErrorBoundary className="min-h-screen">
  <MyPage />
</ErrorBoundary>

// Custom fallback
<ErrorBoundary
  className="p-8"
  fallback={({ error, resetErrorBoundary }) => (
    <div>
      <p>{error.message}</p>
      <button onClick={resetErrorBoundary}>Retry</button>
    </div>
  )}
>
  <MyPage />
</ErrorBoundary>
```

**Props:**

| Prop        | Type                                                                     | Description                             |
| ----------- | ------------------------------------------------------------------------ | --------------------------------------- |
| `children`  | `ReactNode`                                                              | Content to protect                      |
| `className` | `string`                                                                 | Applied to the fallback container `div` |
| `fallback`  | `(props: { error: Error; resetErrorBoundary: () => void }) => ReactNode` | Custom fallback renderer                |
| `onError`   | `(error: Error, errorInfo: ErrorInfo) => void`                           | Called when an error is caught          |

---

### BetterspaceDevtools

Development panel showing active subscriptions, pending mutations, and errors.

```typescript
import { BetterspaceDevtools } from 'betterspace/react'

// Add to your layout (dev only)
{process.env.NODE_ENV === 'development' && <BetterspaceDevtools />}
```

### SchemaPlayground

Interactive schema explorer for development.

```typescript
import { SchemaPlayground } from 'betterspace/react'

<SchemaPlayground tables={tables} />
```

### Form field components

All 14 field components (`Arr`, `Choose`, `Colorpick`, `Combobox`, `Datepick`, `File`,
`Files`, `MultiSelect`, `Num`, `Rating`, `Slider`, `Text`, `Timepick`, `Toggle`) accept
three shared accessibility props:

| Prop       | Type      | Description                                 |
| ---------- | --------- | ------------------------------------------- |
| `disabled` | `boolean` | Disables the input and prevents interaction |
| `helpText` | `string`  | Renders a hint below the field              |
| `required` | `boolean` | Appends a red `*` to the field label        |

```typescript
import { fields } from 'betterspace/components'
const { Text, Toggle, Choose, Num } = fields

// disabled
<Text name="title" disabled />

// helpText
<Text name="slug" helpText="Used in the URL. Lowercase letters and hyphens only." />

// required
<Text name="title" required />
<Toggle name="published" trueLabel="Published" required />
<Choose name="category" required />
<Num name="price" required helpText="Enter price in USD" />
```

These props work on every field component.
`disabled` propagates to the underlying input element.
`helpText` renders as a `<p>` below the input.
`required` adds a visual indicator only — actual validation is enforced by the Zod
schema.

---

### AutoSaveIndicator

Displays the current auto-save status when using `useForm` with `autoSave: true`. Shows
“Saving…”, “Saved”, or an error state.

```typescript
import { AutoSaveIndicator } from 'betterspace/components'

<AutoSaveIndicator className="text-sm text-muted-foreground" />
```

Place it inside a `<Form>` to pick up auto-save state automatically.

---

### ConflictDialog

Modal dialog for resolving concurrent edit conflicts.
Shows a diff between the server version and local changes with three resolution options:
**Reload** (use server version), **Overwrite** (force local changes), or **Cancel**.

```typescript
import { ConflictDialog } from 'betterspace/components'

<ConflictDialog
  conflict={form.conflict}
  onResolve={action => form.resolveConflict(action)}
  className="max-w-lg"
/>
```

**Props:**

| Prop        | Type                                                    | Description                                               |
| ----------- | ------------------------------------------------------- | --------------------------------------------------------- |
| `conflict`  | `ConflictData \| null`                                  | Conflict payload from `useForm`. `null` hides the dialog. |
| `onResolve` | `(action: 'cancel' \| 'overwrite' \| 'reload') => void` | Called when the user picks a resolution                   |
| `className` | `string`                                                | Applied to the dialog content container                   |

---

### OfflineIndicator

Renders a fixed-position banner when the SpacetimeDB connection is inactive.
Automatically hides when the connection is restored.

```typescript
import { OfflineIndicator } from 'betterspace/components'

// Add to your layout
<OfflineIndicator className="z-50" />
```

Accepts all `<p>` element props.
Renders nothing when connected.

---

### OrgAvatar

Renders an organization avatar with image support and fallback initials.

```typescript
import { OrgAvatar } from 'betterspace/components'

<OrgAvatar name="Acme Corp" src={org.avatarUrl} className="size-8" />
```

**Props:**

| Prop   | Type     | Description                                        |
| ------ | -------- | -------------------------------------------------- |
| `name` | `string` | Organization name (first 2 chars used as fallback) |
| `src`  | `string` | Optional avatar image URL                          |

Accepts all props from the underlying `Avatar` component.

---

### RoleBadge

Displays a styled badge for a user’s organization role.

```typescript
import { RoleBadge } from 'betterspace/components'

<RoleBadge role="admin" />
```

Role → variant mapping: `owner` = default, `admin` = secondary, `member` = outline.
Accepts all `Badge` component props.

---

### EditorsSection

Renders a card with the current editors list and a dropdown to add/remove editors.
Designed for org-scoped resources with ACL.

```typescript
import { EditorsSection } from 'betterspace/components'

<EditorsSection
  editorsList={editors}
  members={orgMembers}
  onAdd={userId => addEditor({ id: resourceId, editorId: userId })}
  onRemove={userId => removeEditor({ id: resourceId, editorId: userId })}
/>
```

**Props:**

| Prop          | Type                                                                    | Description                                         |
| ------------- | ----------------------------------------------------------------------- | --------------------------------------------------- |
| `editorsList` | `{ email: string; name: string; userId: string }[]`                     | Current editors                                     |
| `members`     | `{ user: { email?: string; name?: string } \| null; userId: string }[]` | All org members (non-editors shown in add dropdown) |
| `onAdd`       | `(userId: string) => void`                                              | Called when adding an editor                        |
| `onRemove`    | `(userId: string) => void`                                              | Called when removing an editor                      |

Accepts all `Card` component props.

---

### PermissionGuard

Conditionally renders children based on org role or a custom access check.
Shows a “view only” fallback with a back link when access is denied.

```typescript
import { PermissionGuard } from 'betterspace/components'

<PermissionGuard
  role={membership.role}
  allowedRoles={['owner', 'admin']}
  resource="wiki page"
  backHref="/wiki"
  backLabel="wiki"
>
  <EditForm />
</PermissionGuard>
```

**Props:**

| Prop           | Type        | Description                                        |
| -------------- | ----------- | -------------------------------------------------- |
| `role`         | `OrgRole`   | Current user’s role                                |
| `allowedRoles` | `OrgRole[]` | Roles that can access the content                  |
| `canAccess`    | `boolean`   | Direct override (takes precedence over role check) |
| `resource`     | `string`    | Display name for the “no permission” message       |
| `backHref`     | `string`    | URL for the back button                            |
| `backLabel`    | `string`    | Label for the back button                          |
| `className`    | `string`    | Applied to the fallback container                  |

---

### defineSteps

Creates a type-safe multi-step form with per-step Zod schemas, navigation guards, and a
stepper hook. Each step has its own schema and typed field accessors.

```typescript
import { defineSteps } from 'betterspace/components'

const { StepForm, useStepper, steps } = defineSteps([
  { id: 'profile', label: 'Profile', schema: profileSchema },
  { id: 'org', label: 'Organization', schema: orgSchema },
  { id: 'prefs', label: 'Preferences', schema: prefsSchema }
] as const)

const Onboarding = () => {
  const stepper = useStepper({
    onSubmit: async data => {
      // data.profile, data.org, data.prefs — all typed
      await createAccount(data)
    }
  })

  return (
    <StepForm stepper={stepper}>
      <StepForm.Step id="profile" render={f => (
        <>
          <f.Text name="displayName" />
          <f.Text name="bio" />
        </>
      )} />
      <StepForm.Step id="org" render={f => (
        <>
          <f.Text name="name" />
          <f.Text name="slug" />
        </>
      )} />
      <StepForm.Step id="prefs" render={f => (
        <f.Choose name="theme" />
      )} />
    </StepForm>
  )
}
```

**Step IDs are type-checked** — misspelling a step ID or accessing the wrong field for a
step is a compile-time error.

**`useStepper` return value:**

| Field         | Type                   | Description                           |
| ------------- | ---------------------- | ------------------------------------- |
| `error`       | `Error \| null`        | Error from the `onSubmit` callback    |
| `isCompleted` | `boolean`              | `true` after all steps submitted      |
| `isPending`   | `boolean`              | `true` while `onSubmit` is running    |
| `values`      | `Partial<StepDataMap>` | Collected values from completed steps |

**`StepForm` props:**

| Prop          | Type            | Description                                    |
| ------------- | --------------- | ---------------------------------------------- |
| `stepper`     | `StepperReturn` | Return value from `useStepper`                 |
| `indicator`   | `boolean`       | Show step progress indicator (default: `true`) |
| `nextLabel`   | `string`        | Custom “Next” button text                      |
| `prevLabel`   | `string`        | Custom “Back” button text                      |
| `submitLabel` | `string`        | Custom “Submit” button text                    |

---

### FileApiProvider

Provides file upload configuration to nested `File` and `Files` field components.
Wrap your form with this provider when using file fields.

```typescript
import { FileApiProvider } from 'betterspace/components'
import { createFileUploader } from 'betterspace/react'

const uploader = createFileUploader('/api/upload/presign')

<FileApiProvider value={{ upload: uploader }}>
  <Form form={form} render={f => (
    <f.File name="avatar" />
  )} />
</FileApiProvider>
```

---

### Provider utilities

Provider setup helpers are exported from `betterspace/react`:

```typescript
import {
  createFileUploader,
  createSpacetimeClient,
  createTokenStore,
  toWsUri
} from 'betterspace/react'

const tokenStore = createTokenStore()
const uri = toWsUri(
  process.env.NEXT_PUBLIC_SPACETIMEDB_URL ?? 'http://localhost:3000'
)
const client = createSpacetimeClient({
  DbConnection,
  moduleName: 'my-app',
  tokenStore,
  uri
})
const uploader = createFileUploader('/api/upload/presign')
```

---

## Server utilities

### identityToHex / identityFromHex

Convert between `Identity` objects and hex strings.

```typescript
import { identityToHex, identityFromHex } from 'betterspace'

const hex = identityToHex(identity) // 'c200725ff16b4c1d...'
const identity = identityFromHex(hex)
```

**Important:** Use `.isEqual()` to compare `Identity` objects, not `===`:

```typescript
// Wrong
identity1 === identity2

// Correct
identity1.isEqual(identity2)
// Or use the helper:
import { identityEquals } from 'betterspace/server'
identityEquals(identity1, identity2)
```

### idToWire / idFromWire

Convert between numeric IDs and wire format strings (for URLs, etc.).

```typescript
import { idToWire, idFromWire } from 'betterspace'

const wire = idToWire(42) // '42'
const id = idFromWire('42') // 42
```

`idFromWire` rejects empty and whitespace-only strings with an `Err` result instead of
silently returning `0` (which `Number('')` would produce).

### partialValues

Creates an object with all keys from a Zod schema, filling unspecified ones with
`undefined`. Eliminates the boilerplate of passing every optional field explicitly when
calling update reducers.

```typescript
import { partialValues } from 'betterspace/zod'

update(partialValues(editSchema, { id, published: true }))
```

**Signature:**

```typescript
partialValues = <S extends ZodObject<ZodRawShape>>(
  schema: S,
  values: Partial<output<S>>
): output<S>
```

Without `partialValues` you’d write:

```typescript
update({ title: undefined, content: undefined, id, published: true })
```

With it:

```typescript
update(partialValues(editSchema, { id, published: true }))
```

---

### zodFromTable

Convert SpacetimeDB column definitions to a Zod schema.
See [forms](./forms.md).

```typescript
import { zodFromTable } from 'betterspace'

const schema = zodFromTable(tables.post.columns, {
  exclude: ['published'],
  optional: ['content']
})
```

### createS3UploadPresignedUrl / createS3DownloadPresignedUrl

Generate AWS Signature V4 pre-signed URLs for S3/MinIO.

```typescript
import {
  createS3UploadPresignedUrl,
  createS3DownloadPresignedUrl
} from 'betterspace/server'

const uploadUrl = await createS3UploadPresignedUrl({
  accessKeyId: '...',
  secretAccessKey: '...',
  bucket: 'my-bucket',
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  key: 'uploads/file.jpg',
  contentType: 'image/jpeg',
  expiresInSeconds: 900 // 15 minutes
})
```

### getFirstFieldError

Returns the first field error message from a Betterspace error, or `undefined` if none.
Import from `betterspace/server`.

**Signature:**

```typescript
const getFirstFieldError = (e?: unknown): string | undefined
```

```typescript
import { getFirstFieldError } from 'betterspace/server'

const msg = getFirstFieldError(error)
if (msg) toast.error(msg)
```

### err

Throws a `SenderError` with a typed error code and optional debug message.
Use inside reducers and server logic.

```typescript
import { err } from 'betterspace/server'

err('NOT_FOUND')
err('FORBIDDEN', 'User does not own this resource')
err('VALIDATION_FAILED', 'Title must be non-empty')
```

`SenderError` has a `_tag` discriminator for `instanceof`-free error matching:

```typescript
import { SenderError } from 'betterspace/server'

if (error instanceof SenderError) { ... }
if (error._tag === 'SenderError') { ... }
```

### errValidation

Throws a `SenderError` with `VALIDATION_FAILED` code and field-level errors.

```typescript
import { errValidation } from 'betterspace/server'

errValidation({ title: 'Required', slug: 'Already taken' })
```

---

### Server Middleware

betterspace ships four built-in middleware factories exported from `betterspace/server`.
Pass them as an array to the second argument of `betterspace()`:

```typescript
import { betterspace } from 'betterspace/server'
import { auditLog, inputSanitize, slowQueryWarn } from 'betterspace/server'

export default betterspace(
  ({ table }) => ({
    blog: table(s.blog, { pub: 'published' })
  }),
  {
    middleware: [inputSanitize(), auditLog(), slowQueryWarn({ threshold: 200 })]
  }
)
```

Middleware runs in array order for `before*` hooks and in reverse order for `after*`
hooks, matching the standard onion model.

#### `composeMiddleware`

```typescript
composeMiddleware(...middlewares: Middleware[]): GlobalHooks
```

Chains multiple middleware into a single `GlobalHooks` object consumed by the
betterspace setup internals.
You don’t call this directly — betterspace calls it when it processes the `middleware`
array you pass. It’s exported for advanced use cases where you need to compose hooks
outside of the standard setup flow.

#### `inputSanitize`

```typescript
inputSanitize(opts?: { fields?: string[] }): Middleware
```

Strips `<script>` tags and inline event handlers (`onXxx=`) from string fields in create
and update data before the operation reaches the reducer.
By default it sanitizes every string field.
Pass `{ fields: ['content', 'bio'] }` to target specific fields only.

#### `auditLog`

```typescript
auditLog(opts?: { logLevel?: 'debug' | 'info'; verbose?: boolean }): Middleware
```

Logs a structured audit entry for every create, update, and delete operation.
Each entry includes the sender identity, table name, and operation type.
Set `verbose: true` to also log the data or field details involved.
Default log level is `'info'`.

#### `slowQueryWarn`

```typescript
slowQueryWarn(opts?: { threshold?: number }): Middleware
```

Emits a warning when any reducer operation exceeds the time threshold.
Logs the table name, operation, and actual duration so you can identify hot paths.
Default threshold is 500ms.

#### Custom middleware

Implement the `Middleware` interface to write your own:

```typescript
interface Middleware {
  name: string
  beforeCreate?: (ctx: MiddlewareCtx, args: { data: Rec }) => Rec | Promise<Rec>
  afterCreate?: (
    ctx: MiddlewareCtx,
    args: { data: Rec; row: Rec }
  ) => void | Promise<void>
  beforeUpdate?: (
    ctx: MiddlewareCtx,
    args: { patch: Rec; prev: Rec }
  ) => Rec | Promise<Rec>
  afterUpdate?: (
    ctx: MiddlewareCtx,
    args: { next: Rec; patch: Rec; prev: Rec }
  ) => void | Promise<void>
  beforeDelete?: (
    ctx: MiddlewareCtx,
    args: { row: Rec }
  ) => void | Promise<void>
  afterDelete?: (ctx: MiddlewareCtx, args: { row: Rec }) => void | Promise<void>
}
```

`before*` hooks return the (possibly mutated) data or patch object.
`after*` hooks are fire-and-forget.
`MiddlewareCtx` carries the sender identity and table name so you can branch on them.

---

## CLI

### `betterspace init` pre-flight checks

Before scaffolding, `betterspace init` runs pre-flight checks to catch missing
dependencies early:

```bash
bunx betterspace init
```

Output:

```
Pre-flight checks:
  ✓ spacetime CLI
  ✓ Docker running

Scaffolding betterspace project...
```

The checks verify:

| Check           | Pass                              | Warn                                  |
| --------------- | --------------------------------- | ------------------------------------- |
| SpacetimeDB CLI | `spacetime` found in PATH         | Install command printed               |
| Docker          | `docker` found and daemon running | Install or start instructions printed |

Warnings don’t abort the scaffold — files are still written.
The warnings tell you what to fix before running `spacetime publish`.

**Options:**

| Flag               | Default   | Description                  |
| ------------------ | --------- | ---------------------------- |
| `--module-dir=DIR` | `module`  | SpacetimeDB module directory |
| `--app-dir=DIR`    | `src/app` | Next.js app directory        |
| `--help`, `-h`     |           | Print help and exit          |

---

### `betterspace validate`

Lint schema, reducers, indexes, and access control in one command.
An alias for `betterspace check --health`.

```bash
betterspace validate
betterspace validate --schema-file=t.ts
```

Output:

```
Schema: 4 tables, 3 owned, 1 org
Reducers: 12 generated, 0 custom
Indexes: all covered
Access: all tables have ACL
Health: 100/100
```

Runs the same 7-category checks as `betterspace doctor`. Use it in CI to catch schema
drift before deployment.

---

## Error codes

Reducers throw `SenderError('CODE: message')`. The client receives the error with the
message intact.

`SenderError` carries a `_tag` property set to `'SenderError'` as a const.
Use it to narrow errors in catch blocks without an `instanceof` check:

```typescript
try {
  await save(data)
} catch (e) {
  if (e instanceof Error && '_tag' in e && e._tag === 'SenderError') {
    // narrowed to SenderError
  }
}
```

betterspace currently ships **36 structured error codes** (`ErrorCode`), defined in
`ERROR_MESSAGES`. Each code maps to a descriptive message with enough context to surface
directly to users (e.g., `CONFLICT` reads “This record was modified by someone else —
please review and try again” rather than a bare “Conflict”).

| Code                        | Description                                                            |
| --------------------------- | ---------------------------------------------------------------------- |
| `ALREADY_ORG_MEMBER`        | Already a member of this organization                                  |
| `CANNOT_MODIFY_ADMIN`       | Admins cannot modify other admins                                      |
| `CANNOT_MODIFY_OWNER`       | Cannot modify the owner                                                |
| `CHUNK_ALREADY_UPLOADED`    | Chunk already uploaded                                                 |
| `CHUNK_NOT_FOUND`           | Chunk not found                                                        |
| `CONFLICT`                  | This record was modified by someone else — please review and try again |
| `EDITOR_REQUIRED`           | Editor permission required                                             |
| `FILE_NOT_FOUND`            | The requested file could not be found or has been deleted              |
| `FILE_TOO_LARGE`            | File exceeds the maximum allowed size                                  |
| `FORBIDDEN`                 | You do not have permission to perform this action                      |
| `INCOMPLETE_UPLOAD`         | Upload is incomplete — some chunks are still missing                   |
| `INSUFFICIENT_ORG_ROLE`     | Insufficient permissions for this organization role                    |
| `INVALID_FILE_TYPE`         | Invalid file type                                                      |
| `INVALID_INVITE`            | Invalid invite                                                         |
| `INVALID_MESSAGE`           | Invalid message                                                        |
| `INVALID_SESSION_STATE`     | Invalid session state                                                  |
| `INVALID_TOOL_ARGS`         | Invalid tool arguments                                                 |
| `INVALID_WHERE`             | Invalid filter parameters — check field names and values               |
| `INVITE_EXPIRED`            | Invite has expired                                                     |
| `JOIN_REQUEST_EXISTS`       | Join request already exists                                            |
| `LIMIT_EXCEEDED`            | Request limit exceeded — please try again later                        |
| `MESSAGE_NOT_SAVED`         | Message not saved                                                      |
| `MUST_TRANSFER_OWNERSHIP`   | Must transfer ownership before leaving                                 |
| `NO_FETCHER`                | No fetcher configured                                                  |
| `NO_PRECEDING_USER_MESSAGE` | No preceding user message                                              |
| `NOT_AUTHENTICATED`         | Please log in to continue                                              |
| `NOT_AUTHORIZED`            | You are not authorized to access this resource                         |
| `NOT_FOUND`                 | The requested resource could not be found                              |
| `NOT_ORG_MEMBER`            | Not a member of this organization                                      |
| `ORG_SLUG_TAKEN`            | Organization slug already taken                                        |
| `RATE_LIMITED`              | Too many requests — please wait before trying again                    |
| `SESSION_NOT_FOUND`         | Session not found                                                      |
| `TARGET_MUST_BE_ADMIN`      | Can only transfer ownership to an admin                                |
| `UNAUTHORIZED`              | Authentication required — please log in                                |
| `USER_NOT_FOUND`            | User not found                                                         |
| `VALIDATION_FAILED`         | One or more fields failed validation — check your input                |

Parse errors on the client:

```typescript
import {
  extractErrorData,
  getErrorCode,
  getErrorMessage
} from 'betterspace/server'

try {
  await createPost(data)
} catch (error) {
  const code = getErrorCode(error) // 'NOT_FOUND' | 'FORBIDDEN' | ...
  const message = getErrorMessage(error) // human-readable string
  const detail = extractErrorData(error) // full ErrorData object
}
```

---

## Type reference

### SpacetimeDB type mapping

| SpacetimeDB type | TypeScript type  | Notes                                                               |
| ---------------- | ---------------- | ------------------------------------------------------------------- |
| `t.u32()`        | `number`         | Safe for JSON, URLs, React keys                                     |
| `t.u64()`        | `bigint`         | Breaks `JSON.stringify`. Use `.toString()` for URLs/keys.           |
| `t.string()`     | `string`         |                                                                     |
| `t.bool()`       | `boolean`        |                                                                     |
| `t.number()`     | `number`         | Floating point                                                      |
| `t.identity()`   | `Identity`       | Use `.toHexString()` for serialization, `.isEqual()` for comparison |
| `t.timestamp()`  | `Timestamp`      | Use `toMillis()` or convert via `microsSinceUnixEpoch`              |
| `t.array(T)`     | `T[]`            |                                                                     |
| `T.optional()`   | `T \| undefined` |                                                                     |

**Recommendation:** Use `t.u32()` for all auto-increment IDs.
`u32` maps to `number` and works everywhere.
`u64` maps to `bigint` and breaks JSON serialization.

### Type exports from `betterspace/react`

All types are importable directly:

```typescript
import type {
  BulkProgress,
  BulkResult,
  ConflictData,
  CreateSpacetimeClientOptions,
  DevtoolsProps,
  ErrorData,
  ErrorHandler,
  ErrorToastOptions,
  FieldKind,
  FieldMeta,
  FieldMetaMap,
  FormReturn,
  InfiniteListOptions,
  InfiniteListResult,
  InfiniteListWhere,
  ListSort,
  ListWhere,
  MutateOptions,
  MutateToast,
  MutationType,
  MutationFail,
  MutationOk,
  MutationResult,
  OptimisticOptions,
  PendingMutation,
  PlaygroundProps,
  PresenceRefs,
  PresenceUser,
  SkipInfiniteListResult,
  SkipListResult,
  SoftDeleteOpts,
  SortDirection,
  SortMap,
  SortObject,
  SpacetimeConnectionBuilder,
  SpacetimeConnectionFactory,
  ToastFn,
  TokenStore,
  TypedFieldErrors,
  UseBulkMutateOptions,
  UseBulkSelectionOpts,
  UseCacheEntryOptions,
  UseCacheEntryResult,
  UseListOptions,
  UseListResult,
  UsePresenceOptions,
  UsePresenceResult,
  UseSearchOptions,
  UseSearchResult,
  WhereFieldValue,
  WhereGroup,
  Widen
} from 'betterspace/react'
```

---

### Register interface

`Register` is an empty interface you can augment via declaration merging to configure
global betterspace types.
This lets you set a project-wide default error type and metadata type without touching
library source.

```typescript
// In your project (e.g., types/betterspace.d.ts)
import type { MyError } from './errors'
import type { MyMeta } from './meta'

declare module 'betterspace/server' {
  interface Register {
    defaultError: MyError
    meta: MyMeta
  }
}
```

After augmenting `Register`, two derived types update automatically:

```typescript
import type { RegisteredDefaultError, RegisteredMeta } from 'betterspace/server'

// RegisteredDefaultError resolves to MyError (or Error if not set)
// RegisteredMeta resolves to MyMeta (or Record<string, unknown> if not set)
```

---

### InferRow, InferCreate, InferUpdate

Derive TypeScript types from betterspace schema brands.

```typescript
import type { InferRow, InferCreate, InferUpdate } from 'betterspace/server'
import { schema } from 'betterspace/schema'
import { boolean, object, string } from 'zod/v4'

const s = schema({
  owned: {
    post: object({
      title: string(),
      content: string(),
      published: boolean()
    })
  }
})

type PostRow = InferRow<typeof s.post>

type PostCreate = InferCreate<typeof s.post>

type PostUpdate = InferUpdate<typeof s.post>
```

`InferRow` is brand-aware:

| Schema brand      | Extra fields on `InferRow`                  |
| ----------------- | ------------------------------------------- |
| `OwnedSchema`     | `userId: string`                            |
| `OrgSchema`       | `userId: string`, `orgId: number \| string` |
| `BaseSchema`      | none                                        |
| `SingletonSchema` | `userId: string`, `updatedAt: number`       |

---

### InferRows

Maps `InferRow` over a record of schemas, producing a typed row map.

```typescript
import type { InferRows } from 'betterspace/server'

const schemas = {
  post: postSchema,
  profile: profileSchema
}

type Rows = InferRows<typeof schemas>
// { post: PostRow; profile: ProfileRow }
```

---

### UndefinedToOptional

Type-level utility that converts `T | undefined` fields from required to optional.
Optional fields also accept `null`, which SpacetimeDB serializes identically to
`undefined` (both become `None`). This lets you pass Zod form data (which uses
`.nullable()`) directly to reducers without manual `?? undefined` conversions.
Exported from `betterspace` (main entry point).

```typescript
import type { UndefinedToOptional } from 'betterspace'

type Generated = {
  id: number
  title: string | undefined
  published: boolean | undefined
}
type Relaxed = UndefinedToOptional<Generated>
// { id: number; title?: string | undefined | null; published?: boolean | undefined | null }
```

Used internally by `useMutation` and `relax()` to make SpacetimeDB-generated reducer
args ergonomic — fields that accept `undefined` become optional so callers only need to
pass the fields they care about.
Zod nullable fields (`string | null`) can be passed through without conversion.

---

### SchemaPhantoms and phantom type accessors

`SchemaPhantoms<C, R, U>` is the interface that branded schemas implement to expose
their inferred types as readable properties.
You don’t construct it directly — it’s already on every schema entry returned by
`schema()`.

```typescript
interface SchemaPhantoms<C, R, U> {
  readonly $inferCreate: C
  readonly $inferRow: R
  readonly $inferUpdate: U
  readonly '~types': {
    readonly create: C
    readonly row: R
    readonly update: U
  }
}
```

Access types via `typeof s.post.$inferRow` (no import needed):

```typescript
import { schema } from 'betterspace/schema'
import { boolean, object, string } from 'zod/v4'

const s = schema({
  owned: {
    post: object({
      title: string(),
      published: boolean()
    })
  }
})

type PostRow = typeof s.post.$inferRow
type PostCreate = typeof s.post.$inferCreate
type PostUpdate = typeof s.post.$inferUpdate
```

Access types via `typeof s.post.$inferRow` (no import needed):

The `~types` accessor groups all three under one namespace:

```typescript
type PostTypes = (typeof postSchema)['~types']
type PostRow = PostTypes['row']
```

These are equivalent to `InferRow<typeof postSchema>` but don’t require importing the
utility type.

---

### InferReducerArgs, InferReducerReturn, InferReducerInputs, InferReducerOutputs

Extract argument and return types from generated reducer objects.

```typescript
import type {
  InferReducerArgs,
  InferReducerReturn,
  InferReducerInputs,
  InferReducerOutputs
} from 'betterspace/server'
import { reducers } from '@/generated/module_bindings'

// Single reducer
type CreatePostArgs = InferReducerArgs<typeof reducers.create_post>
type CreatePostReturn = InferReducerReturn<typeof reducers.create_post>

// All reducers at once
type AllArgs = InferReducerInputs<typeof reducers>
type AllReturns = InferReducerOutputs<typeof reducers>
```

Use these when writing typed wrappers around generated reducers.

---

### TypedFieldErrors and getFieldErrors

`TypedFieldErrors<S>` is a partial record of field names from a Zod schema to error
strings. `getFieldErrors<S>(error)` extracts field-level validation errors from a
betterspace error, narrowed to the schema’s keys.

```typescript
import type { TypedFieldErrors } from 'betterspace/server'
import { getFieldErrors } from 'betterspace/server'
import { z } from 'zod/v4'

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(10)
})

type PostFieldErrors = TypedFieldErrors<typeof postSchema>
// Partial<{ title: string; content: string }>

try {
  await createPost(data)
} catch (error) {
  const fieldErrors = getFieldErrors<typeof postSchema>(error)
  // fieldErrors?.title — type-safe, only valid field names
  // fieldErrors?.content
}
```

`getFieldErrors` returns `undefined` when the error has no field-level data.

---

### schemaVariants

Generates create and update schema variants from a single base schema.
The create variant is the original schema.
The update variant makes all fields optional, with selected keys kept required.

```typescript
import { schemaVariants } from 'betterspace/zod'
import { z } from 'zod/v4'

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  published: z.boolean()
})

const { create, update } = schemaVariants(postSchema, ['title'])
// create: { title: string; content: string; published: boolean }
// update: { title: string; content?: string; published?: boolean }
// 'title' stays required in the update variant

// Without requiredOnUpdate — all fields become optional
const { create: c2, update: u2 } = schemaVariants(postSchema)
// update: { title?: string; content?: string; published?: boolean }
```

Use `schemaVariants` to avoid duplicating schema definitions for create and edit forms.

`schemaVariants().update` now preserves full field type information rather than widening
to `ZodObject<ZodRawShape>`.

---

### buildMeta / getMeta with Zod v4 globalRegistry

`buildMeta` and `getMeta` read Zod v4’s `globalRegistry` for `title` and `description`
metadata. The `FieldMeta` interface includes optional `title` and `description` fields.

`buildMeta` is generic — the return type preserves the exact field names from your Zod
schema, so `meta.typo` is a type error:

```typescript
import { buildMeta } from 'betterspace/react'
import { z } from 'zod/v4'

const postSchema = z.object({
  title: z
    .string()
    .meta({ title: 'Post Title', description: 'The main heading' }),
  content: z.string().meta({ description: 'Markdown content' })
})

const meta = buildMeta(postSchema)
// meta.title  → { kind: 'string', title: 'Post Title', description: 'The main heading' }
// meta.content → { kind: 'string', description: 'Markdown content' }
// meta.typo   → TS error: Property 'typo' does not exist
```

When a field has no `.meta()` call, `title` and `description` are `undefined`.

---

### injectError (devtools)

Programmatically inject a fake error into the devtools error panel.
Useful for testing error UI without triggering real server errors.

```typescript
import { injectError } from 'betterspace/react'

// Inject a NOT_FOUND error
injectError('NOT_FOUND')

// Inject with extra detail
injectError('FORBIDDEN', {
  message: 'You do not own this post',
  table: 'post',
  op: 'update'
})
```

**Signature:**

```typescript
injectError = (
  code: ErrorCode,
  opts?: { detail?: string; message?: string; op?: string; table?: string }
) => void
```

The injected error appears in the devtools **Errors** tab immediately.
The devtools panel also includes an error injection dropdown in development mode,
letting you trigger any error code without writing code.
