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
Supports the same `search` option as `useList`, including `debounceMs`. When `where` or
`search.query` changes, the visible count resets to `batchSize` automatically.

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

### useBulkSelection

Multi-select state management for list UIs.

```typescript
import { useBulkSelection } from 'betterspace/react'

const { selected, toggle, toggleAll, clear, isSelected, isAllSelected, count } =
  useBulkSelection(posts.map(p => p.id))
```

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
| `retry` | `number \| RetryOptions` | Retry on failure. A number sets `maxAttempts`. |
| `type` | `MutationType` | Override the detected mutation type |

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
  }
})
```

**`onSettled` signature:** `(args: A, error: unknown, result?: R) => void`

* * *

### useOnlineStatus

Tracks browser online/offline state.

```typescript
import { useOnlineStatus } from 'betterspace/react'

const isOnline = useOnlineStatus()
```

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

* * *

## CLI

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

betterspace currently ships **36 structured error codes** (`ErrorCode`), defined in
`ERROR_MESSAGES`.

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
