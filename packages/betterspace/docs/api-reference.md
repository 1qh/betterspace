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

**Type-safe `where`:**

The `where` option is generic over `T` — field names are checked against the row type at
compile time:

```typescript
useList(blogs, ready, { where: { publishd: true } }) // TS error: 'publishd' doesn't exist
useList(blogs, ready, { where: { published: true } }) // OK
useList(items, ready, { where: { price: { $gt: 10 } } }) // OK
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
Accepts the same type-safe `where` option as `useList`.

```typescript
import { useInfiniteList } from 'betterspace/react'

const { data, hasMore, loadMore, totalCount } = useInfiniteList(rows, isReady, {
  pageSize: 20,
  sort: { updatedAt: 'desc' },
  where: { published: true }
})
```

* * *

### useSearch

Client-side full-text search over subscription data.

```typescript
import { useSearch } from 'betterspace/react'

const results = useSearch(posts, query, {
  fields: ['title', 'content']
})
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

### useBulkMutate

Run a reducer against multiple rows, collecting results and calling a callback when all
settle.

```typescript
import { useBulkMutate } from 'betterspace/react'

const bulk = useBulkMutate(removeTask, {
  onSuccess: count => toast(`${count} deleted`)
})
bulk.run([{ id: 1 }, { id: 2 }, { id: 3 }])
```

**Options:**

| Option | Type | Description |
| --- | --- | --- |
| `onSuccess` | `(count: number) => void` | Called when all mutations succeed |
| `onError` | `(errors: unknown[]) => void` | Called if any mutation fails |
| `onSettled` | `(results: SettledResult[]) => void` | Called after all mutations settle |

* * *

### useOnlineStatus

Tracks browser online/offline state.

```typescript
import { useOnlineStatus } from 'betterspace/react'

const isOnline = useOnlineStatus()
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
