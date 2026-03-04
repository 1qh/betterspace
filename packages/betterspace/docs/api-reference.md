# API Reference

## Server factories

All factories are imported from `betterspace/server` (or the bundled
`betterspace-server.js` for SpacetimeDB modules).

### makeCrud

Generates `create`, `update`, and `rm` reducers for a user-owned table.

```typescript
import { makeCrud } from 'betterspace/server'

const postCrud = makeCrud(spacetimedb, {
  // Required: field definitions for create/update
  fields: {
    title: t.string(),
    content: t.string(),
    published: t.bool()
  },

  // Required: primary key type
  idField: t.u32(),

  // Required: primary key accessor
  pk: tbl => tbl.id,

  // Required: table accessor
  table: db => db.post,

  // Required: table name (used for reducer naming)
  tableName: 'post',

  // Optional: enables optimistic conflict detection
  expectedUpdatedAtField: t.timestamp(),

  // Optional: lifecycle hooks
  options: {
    softDelete: false, // set true to set deletedAt instead of deleting
    hooks: {
      beforeCreate: (ctx, { data }) => data,
      afterCreate: (ctx, { data, row }) => {},
      beforeUpdate: (ctx, { patch, prev }) => patch,
      afterUpdate: (ctx, { next, patch, prev }) => {},
      beforeDelete: (ctx, { row }) => {},
      afterDelete: (ctx, { row }) => {}
    }
  }
})
```

**Generated reducers:**

| Reducer | Parameters | Description |
| --- | --- | --- |
| `create_{tableName}` | All fields | Insert a row. Sets `userId = ctx.sender`, `updatedAt = ctx.timestamp`, `id = 0` (auto-inc). |
| `update_{tableName}` | `id`, optional fields, optional `expectedUpdatedAt` | Update a row. Caller must be the owner. Throws `CONFLICT` if `expectedUpdatedAt` doesn’t match. |
| `rm_{tableName}` | `id` | Delete a row (or soft-delete if `softDelete: true`). Caller must be the owner. |

**Ownership:** All write operations check `row.userId === ctx.sender`. Non-owners get a
`FORBIDDEN` error.

* * *

### makeOrgCrud

Like `makeCrud`, but for org-scoped tables.
Checks org membership before writes.

```typescript
import { makeOrgCrud } from 'betterspace/server'

const projectCrud = makeOrgCrud(spacetimedb, {
  fields: {
    name: t.string(),
    description: t.string().optional()
  },
  idField: t.u32(),
  orgIdField: t.u32(),
  orgMemberTable: db => db.orgMember,
  pk: tbl => tbl.id,
  table: db => db.project,
  tableName: 'project',
  expectedUpdatedAtField: t.timestamp(),
  options: {
    softDelete: false,
    hooks: {
      /* same as makeCrud */
    }
  }
})
```

**Generated reducers:**

| Reducer | Parameters | Description |
| --- | --- | --- |
| `create_{tableName}` | `orgId`, all fields | Insert a row. Requires org membership. |
| `update_{tableName}` | `id`, optional fields | Update a row. Requires org membership + ownership or admin. |
| `rm_{tableName}` | `id` | Delete a row. Requires org membership + ownership or admin. |

* * *

### makeSingletonCrud

For per-user singleton records (one row per user, like a profile or settings).

```typescript
import { makeSingletonCrud } from 'betterspace/server'

const profileCrud = makeSingletonCrud(spacetimedb, {
  fields: {
    displayName: t.string(),
    bio: t.string().optional(),
    theme: t.string()
  },
  table: db => db.profile,
  tableName: 'profile',
  options: {
    hooks: {
      /* beforeCreate, afterCreate, beforeUpdate, afterUpdate, beforeRead */
    }
  }
})
```

**Generated reducers:**

| Reducer | Parameters | Description |
| --- | --- | --- |
| `get_{tableName}` | none | Throws `NOT_FOUND` if no row exists for the caller. Useful for triggering a read hook. |
| `upsert_{tableName}` | All fields (all optional) | Insert or update the caller’s row. |

* * *

### makeCacheCrud

For caching external data (e.g., third-party API responses) with TTL-based expiration.

```typescript
import { makeCacheCrud } from 'betterspace/server'

const movieCrud = makeCacheCrud(spacetimedb, {
  fields: {
    title: t.string(),
    overview: t.string(),
    voteAverage: t.number()
  },
  // The unique key for cache lookup (not the auto-inc id)
  keyField: t.number(),
  keyName: 'tmdbId',
  pk: tbl => tbl.tmdbId,
  table: db => db.movie,
  tableName: 'movie',
  options: {
    ttl: 7 * 24 * 60 * 60 * 1000 // 7 days in ms (default)
  }
})
```

**Generated reducers:**

| Reducer | Parameters | Description |
| --- | --- | --- |
| `create_{tableName}` | `keyName` + all fields | Insert a cache entry. Sets `cachedAt`, `updatedAt`. |
| `update_{tableName}` | `keyName` + optional fields | Update a cache entry. Clears `invalidatedAt`. |
| `rm_{tableName}` | `keyName` | Delete a cache entry. |
| `invalidate_{tableName}` | `keyName` | Mark an entry as invalidated (sets `invalidatedAt`). |
| `purge_{tableName}` | none | Delete all entries older than TTL. |

Cache tables automatically get `cachedAt`, `invalidatedAt`, and `updatedAt` fields.

* * *

### makeChildCrud

For tables that belong to a parent row (e.g., messages in a chat).

```typescript
import { makeChildCrud } from 'betterspace/server'

const messageCrud = makeChildCrud(spacetimedb, {
  fields: {
    content: t.string(),
    role: t.string()
  },
  foreignKeyField: t.u32(),
  foreignKeyName: 'chatId',
  idField: t.u32(),
  parentPk: tbl => tbl.id,
  parentTable: db => db.chat,
  pk: tbl => tbl.id,
  table: db => db.message,
  tableName: 'message',
  expectedUpdatedAtField: t.timestamp()
})
```

**Generated reducers:**

| Reducer | Parameters | Description |
| --- | --- | --- |
| `create_{tableName}` | `foreignKeyName` + all fields | Insert a child row. Verifies parent exists. |
| `update_{tableName}` | `id` + optional fields | Update a child row. Caller must be owner. |
| `rm_{tableName}` | `id` | Delete a child row. Caller must be owner. |

* * *

### makeOrg

Generates the full suite of org management reducers.
See [organizations](./organizations.md) for the full config reference.

* * *

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

| Reducer | Parameters | Description |
| --- | --- | --- |
| `presence_heartbeat_{tableName}` | `roomId`, optional `data` | Upsert presence row. Requires authenticated sender. |
| `presence_leave_{tableName}` | `roomId` | Delete presence row for the caller. |
| `presence_cleanup_{tableName}` | none | Delete stale presence rows (older than TTL). |

Constants: `HEARTBEAT_INTERVAL_MS = 15000`, `PRESENCE_TTL_MS = 30000`.

* * *

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

| Reducer | Parameters | Description |
| --- | --- | --- |
| `register_upload_{namespace}` | `contentType`, `filename`, `size`, `storageKey` | Record a completed upload. Validates type and size. |
| `delete_file_{namespace}` | `fileId` | Delete a file record. Caller must be owner. |

* * *

### setupCrud

`setupCrud` is a convenience wrapper around `setup` that reduces repetitive table wiring
for `crud`, `orgCrud`, `childCrud`, `singletonCrud`, `cacheCrud`, and `fileUpload`.

```typescript
import { setupCrud } from 'betterspace/server'

const s = setupCrud(spacetimedb, {
  expectedUpdatedAtField: t.timestamp(),
  idField: t.u32(),
  orgIdField: t.u32()
})

const postCrud = s.crud('post', {
  title: t.string(),
  content: t.string()
})

const uploadFns = s.fileUpload('file', 'file', {
  contentType: t.string(),
  filename: t.string(),
  size: t.number(),
  storageKey: t.string()
})

const reducers = spacetimedb.exportGroup(s.allExports())
```

* * *

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

| Field | Type | Description |
| --- | --- | --- |
| `data` | `T[]` | Current page of filtered, sorted rows |
| `hasMore` | `boolean` | Whether more rows exist |
| `isLoading` | `boolean` | `true` until `isReady` is `true` |
| `loadMore` | `() => void` | Load the next page |
| `page` | `number` | Current page number |
| `totalCount` | `number` | Total filtered row count |

* * *

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

* * *

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

| Field | Type | Description |
| --- | --- | --- |
| `users` | `PresenceRow[]` | Active users (filtered by TTL) |
| `updatePresence` | `(data: Record<string, unknown>) => void` | Update presence data and send heartbeat |

* * *

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

* * *

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

| Option | Type | Description |
| --- | --- | --- |
| `batchSize` | `number` | Items to load per batch (default: 50) |
| `sort` | `ListSort<T>` | Sort field and direction |
| `where` | `ListWhere<T>` | Filter predicate |
| `search` | `{ query, fields, debounceMs? }` | Full-text search with optional debounce |

* * *

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

* * *

### useCacheEntry

Manages a single cache entry with automatic stale detection and refresh.
Designed for use with `makeCacheCrud` tables where entries may become stale.

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

| Option | Type | Description |
| --- | --- | --- |
| `args` | `A` | Arguments passed to the `load` function |
| `data` | `null \| T \| undefined` | Current cached data (`undefined` = not yet loaded, `null` = miss) |
| `load` | `(args: A) => Promise<void>` | Function to refresh the cache entry |
| `table` | `string` | Table name for devtools tracking |

**Return value (`UseCacheEntryResult<T>`):**

| Field | Type | Description |
| --- | --- | --- |
| `data` | `null \| T` | Cached data, or `null` if not loaded |
| `isLoading` | `boolean` | `true` while loading or refreshing |
| `isStale` | `boolean` | `true` when the entry has `stale: true` |
| `refresh` | `() => void` | Manually trigger a refresh |

* * *

### useBulkSelection

Multi-select state management for list UIs.

```typescript
import { useBulkSelection } from 'betterspace/react'

const { selected, toggle, toggleAll, clear, isSelected, isAllSelected, count } =
  useBulkSelection(posts.map(p => p.id))
```

* * *

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

| Option | Type | Description |
| --- | --- | --- |
| `onError` | `((error: unknown) => void) \| false` | Called if any mutation fails. Pass `false` to suppress the default error toast. |
| `onProgress` | `(progress: BulkProgress) => void` | Called after each item settles with live progress counts |
| `onSettled` | `(result: BulkResult<unknown>) => void` | Called once all items have settled |
| `onSuccess` | `(count: number) => void` | Called when all mutations succeed |

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

| Field | Type | Description |
| --- | --- | --- |
| `isPending` | `boolean` | `true` while any item is still in flight |
| `progress` | `BulkProgress \| null` | Live progress counts, or `null` when idle |
| `run` | `(items: A[]) => Promise<BulkResult<R>>` | Start the bulk operation |

Use `progress` to render a progress bar:

```typescript
const bulk = useBulkMutate(removeTask, {
  onProgress: p => console.log(`${p.succeeded}/${p.total} done`),
  onSuccess: count => toast(`${count} deleted`)
})

bulk.run(selectedIds.map(id => ({ id })))

// bulk.progress: { total: 3, succeeded: 1, failed: 0, pending: 2 }
```

* * *

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

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `rm` | `(args: A) => Promise<unknown>` | required | Delete reducer |
| `restore` | `(args: A) => Promise<unknown>` | required | Restore reducer |
| `toast` | `ToastFn` | required | Toast function with action support |
| `label` | `string` | `'Item'` | Display name for toast messages |
| `undoMs` | `number` | `5000` | Duration the undo toast stays visible |
| `onError` | `(error: unknown) => void` | — | Called if restore fails |
| `onRestore` | `() => void` | — | Called after successful restore |

**Return value:**

| Field | Type | Description |
| --- | --- | --- |
| `remove` | `(args: A) => Promise<void>` | Delete with undo toast |

* * *

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

| Option | Type | Description |
| --- | --- | --- |
| `getName` | `(args: A) => string` | Custom name for devtools tracking |
| `onError` | `((error: unknown) => void) \| false` | Override or suppress the default error toast |
| `onSettled` | `(args: A, error: unknown, result?: R) => void` | Called after every mutation |
| `onSuccess` | `(result: R, args: A) => void` | Called when the mutation succeeds |
| `optimistic` | `boolean` | Enable optimistic updates (default: `true`) |
| `resolveId` | `(args: A) => string \| undefined` | Resolve the row ID for optimistic reconciliation |
| `retry` | `number \| RetryOptions` | Retry on failure. A number sets `maxAttempts`. An object gives full control. |
| `toast` | `MutateToast<A, R>` | Toast shorthand — show success/error messages without `onSuccess`/`onError` callbacks |
| `type` | `MutationType` | Override the detected mutation type (`'create'`, `'update'`, or `'delete'`) |

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

* * *

### useMutation

Combines `useReducer` + `useMutate` into a single call.
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
): ((args: A) => Promise<R>)
```

Instead of:

```typescript
const raw = useReducer(reducers.update_blog)
const save = useMutate(raw, { onSuccess: () => toast.success('Saved') })
```

Write:

```typescript
const save = useMutation(useReducer, reducers.update_blog, {
  onSuccess: () => toast.success('Saved')
})
```

Accepts the same `MutateOptions` as `useMutate`.

* * *

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

| Option | Type | Description |
| --- | --- | --- |
| `mutate` | `(args: A) => Promise<R>` | The mutation function to execute |
| `onOptimistic` | `(args: A) => void` | Called before the mutation to apply optimistic state |
| `onRollback` | `(args: A, error: Error) => void` | Called on failure to revert optimistic state |
| `onSettled` | `(args: A, error: unknown, result?: R) => void` | Called after every mutation |
| `onSuccess` | `(result: R, args: A) => void` | Called when the mutation succeeds |

* * *

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

Available from both `betterspace/react` (base) and `betterspace/components` (with
navigation guard).

```typescript
import { useFormMutation } from 'betterspace/react'

const form = useFormMutation({
  schema: blogSchema,
  mutate: api.blogs.create,
  toast: { success: 'Created', error: 'Failed' }
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

* * *

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

* * *

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

* * *

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

* * *

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

| Error code | Toast message |
| --- | --- |
| `NOT_AUTHENTICATED` | “Please log in” |
| `RATE_LIMITED` | “Too many requests, retry in Xs” (with `retryAfter`) or “Too many requests, try again later” |
| Any other | The error message from the response |

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

* * *

## React components

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

| Prop | Type | Description |
| --- | --- | --- |
| `children` | `ReactNode` | Content to protect |
| `className` | `string` | Applied to the fallback container `div` |
| `fallback` | `(props: { error: Error; resetErrorBoundary: () => void }) => ReactNode` | Custom fallback renderer |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | Called when an error is caught |

* * *

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

| Prop | Type | Description |
| --- | --- | --- |
| `disabled` | `boolean` | Disables the input and prevents interaction |
| `helpText` | `string` | Renders a hint below the field |
| `required` | `boolean` | Appends a red `*` to the field label |

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

* * *

### AutoSaveIndicator

Displays the current auto-save status when using `useForm` with `autoSave: true`. Shows
“Saving…”, “Saved”, or an error state.

```typescript
import { AutoSaveIndicator } from 'betterspace/components'

<AutoSaveIndicator className="text-sm text-muted-foreground" />
```

Place it inside a `<Form>` to pick up auto-save state automatically.

* * *

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

| Prop | Type | Description |
| --- | --- | --- |
| `conflict` | `ConflictData \| null` | Conflict payload from `useForm`. `null` hides the dialog. |
| `onResolve` | `(action: 'cancel' \| 'overwrite' \| 'reload') => void` | Called when the user picks a resolution |
| `className` | `string` | Applied to the dialog content container |

* * *

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

* * *

### OrgAvatar

Renders an organization avatar with image support and fallback initials.

```typescript
import { OrgAvatar } from 'betterspace/components'

<OrgAvatar name="Acme Corp" src={org.avatarUrl} className="size-8" />
```

**Props:**

| Prop | Type | Description |
| --- | --- | --- |
| `name` | `string` | Organization name (first 2 chars used as fallback) |
| `src` | `string` | Optional avatar image URL |

Accepts all props from the underlying `Avatar` component.

* * *

### RoleBadge

Displays a styled badge for a user’s organization role.

```typescript
import { RoleBadge } from 'betterspace/components'

<RoleBadge role="admin" />
```

Role → variant mapping: `owner` = default, `admin` = secondary, `member` = outline.
Accepts all `Badge` component props.

* * *

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

| Prop | Type | Description |
| --- | --- | --- |
| `editorsList` | `{ email: string; name: string; userId: string }[]` | Current editors |
| `members` | `{ user: { email?: string; name?: string } \| null; userId: string }[]` | All org members (non-editors shown in add dropdown) |
| `onAdd` | `(userId: string) => void` | Called when adding an editor |
| `onRemove` | `(userId: string) => void` | Called when removing an editor |

Accepts all `Card` component props.

* * *

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

| Prop | Type | Description |
| --- | --- | --- |
| `role` | `OrgRole` | Current user’s role |
| `allowedRoles` | `OrgRole[]` | Roles that can access the content |
| `canAccess` | `boolean` | Direct override (takes precedence over role check) |
| `resource` | `string` | Display name for the “no permission” message |
| `backHref` | `string` | URL for the back button |
| `backLabel` | `string` | Label for the back button |
| `className` | `string` | Applied to the fallback container |

* * *

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

| Field | Type | Description |
| --- | --- | --- |
| `error` | `Error \| null` | Error from the `onSubmit` callback |
| `isCompleted` | `boolean` | `true` after all steps submitted |
| `isPending` | `boolean` | `true` while `onSubmit` is running |
| `values` | `Partial<StepDataMap>` | Collected values from completed steps |

**`StepForm` props:**

| Prop | Type | Description |
| --- | --- | --- |
| `stepper` | `StepperReturn` | Return value from `useStepper` |
| `indicator` | `boolean` | Show step progress indicator (default: `true`) |
| `nextLabel` | `string` | Custom “Next” button text |
| `prevLabel` | `string` | Custom “Back” button text |
| `submitLabel` | `string` | Custom “Submit” button text |

* * *

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

* * *

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

* * *

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

* * *

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

* * *

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

| Check | Pass | Warn |
| --- | --- | --- |
| SpacetimeDB CLI | `spacetime` found in PATH | Install command printed |
| Docker | `docker` found and daemon running | Install or start instructions printed |

Warnings don’t abort the scaffold — files are still written.
The warnings tell you what to fix before running `spacetime publish`.

**Options:**

| Flag | Default | Description |
| --- | --- | --- |
| `--module-dir=DIR` | `module` | SpacetimeDB module directory |
| `--app-dir=DIR` | `src/app` | Next.js app directory |
| `--help`, `-h` |  | Print help and exit |

* * *

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

* * *

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

| Code | Description |
| --- | --- |
| `ALREADY_ORG_MEMBER` | Already a member of this organization |
| `NOT_FOUND` | Row doesn’t exist |
| `FORBIDDEN` | Caller doesn’t own the row |
| `NOT_AUTHORIZED` | Caller lacks permission for this operation |
| `NOT_ORG_MEMBER` | Caller is not a member of the org |
| `CONFLICT` | `expectedUpdatedAt` doesn’t match current value |
| `NOT_AUTHENTICATED` | Caller has a zero identity (unauthenticated) |
| `INVALID_FILE_TYPE` | File content type not in allowed list |
| `FILE_TOO_LARGE` | File size exceeds limit |
| `RATE_LIMITED` | Too many requests (if rate limiting is implemented) |
| `VALIDATION_FAILED` | Input failed schema validation |

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

* * *

## Type reference

### SpacetimeDB type mapping

| SpacetimeDB type | TypeScript type | Notes |
| --- | --- | --- |
| `t.u32()` | `number` | Safe for JSON, URLs, React keys |
| `t.u64()` | `bigint` | Breaks `JSON.stringify`. Use `.toString()` for URLs/keys. |
| `t.string()` | `string` |  |
| `t.bool()` | `boolean` |  |
| `t.number()` | `number` | Floating point |
| `t.identity()` | `Identity` | Use `.toHexString()` for serialization, `.isEqual()` for comparison |
| `t.timestamp()` | `Timestamp` | Use `toMillis()` or convert via `microsSinceUnixEpoch` |
| `t.array(T)` | `T[]` |  |
| `T.optional()` | `T \| undefined` |  |

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

* * *

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

* * *

### InferRow, InferCreate, InferUpdate

Derive TypeScript types from betterspace schema brands.

```typescript
import type { InferRow, InferCreate, InferUpdate } from 'betterspace/server'
import { makeOwned, makeOrgScoped } from 'betterspace/schema'
import { z } from 'zod/v4'

const postSchema = makeOwned(
  z.object({
    title: z.string(),
    content: z.string(),
    published: z.boolean()
  })
)

// InferRow: the full row as stored in the database
// Includes _id, _creationTime, updatedAt, userId (for owned)
type PostRow = InferRow<typeof postSchema>
// { title: string; content: string; published: boolean; _id: number | string; _creationTime: number; updatedAt: number; userId: string }

// InferCreate: the shape for creating a new row (all fields required)
type PostCreate = InferCreate<typeof postSchema>
// { title: string; content: string; published: boolean }

// InferUpdate: the shape for updating a row (all fields optional)
type PostUpdate = InferUpdate<typeof postSchema>
// { title?: string; content?: string; published?: boolean }
```

`InferRow` is brand-aware:

| Schema brand | Extra fields on `InferRow` |
| --- | --- |
| `OwnedSchema` | `userId: string` |
| `OrgSchema` | `userId: string`, `orgId: number \| string` |
| `BaseSchema` | none |
| `SingletonSchema` | `userId: string`, `updatedAt: number` |

* * *

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

* * *

### SchemaPhantoms and phantom type accessors

`SchemaPhantoms<C, R, U>` is the interface that branded schemas implement to expose
their inferred types as readable properties.
You don’t construct it directly — it’s already on every schema returned by `makeOwned`,
`makeOrgScoped`, `makeBase`, and `makeSingleton`.

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

Access types via `typeof schema.$inferRow` (no import needed):

```typescript
import { makeOwned } from 'betterspace/schema'
import { z } from 'zod/v4'

const postSchema = makeOwned(
  z.object({
    title: z.string(),
    published: z.boolean()
  })
)

type PostRow = typeof postSchema.$inferRow
type PostCreate = typeof postSchema.$inferCreate
type PostUpdate = typeof postSchema.$inferUpdate
```

The `~types` accessor groups all three under one namespace:

```typescript
type PostTypes = (typeof postSchema)['~types']
type PostRow = PostTypes['row']
```

These are equivalent to `InferRow<typeof postSchema>` but don’t require importing the
utility type.

* * *

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

* * *

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

* * *

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

* * *

### buildMeta / getMeta with Zod v4 globalRegistry

`buildMeta` and `getMeta` read Zod v4’s `globalRegistry` for `title` and `description`
metadata. The `FieldMeta` interface includes optional `title` and `description` fields.

`buildMeta` is generic — the return type preserves the exact field names from your Zod
schema, so `meta.typo` is a type error:

```typescript
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

* * *

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
