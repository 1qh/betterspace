# Recipes

## Real-time chat

A chat app with rooms, messages, and live presence.

### Schema

```typescript
// packages/be/spacetimedb/src/index.ts
import { makeCrud, makeChildCrud, makePresence } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

const chat = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      title: t.string(),
      isPublic: t.bool().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  message = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      chatId: t.u32().index(),
      content: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  presence = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      roomId: t.string().index(),
      userId: t.identity().index(),
      data: t.string(),
      lastSeen: t.timestamp()
    }
  ),
  spacetimedb = schema({ chat, message, presence }),
  chatCrud = makeCrud(spacetimedb, {
    fields: { title: t.string(), isPublic: t.bool() },
    idField: t.u32(),
    pk: tbl => tbl.id,
    table: db => db.chat,
    tableName: 'chat'
  }),
  messageCrud = makeChildCrud(spacetimedb, {
    fields: { content: t.string() },
    foreignKeyField: t.u32(),
    foreignKeyName: 'chatId',
    idField: t.u32(),
    parentPk: tbl => tbl.id,
    parentTable: db => db.chat,
    pk: tbl => tbl.id,
    table: db => db.message,
    tableName: 'message'
  }),
  presenceFns = makePresence(spacetimedb, {
    dataField: t.string(),
    roomIdField: t.string(),
    pk: tbl => tbl.id,
    table: db => db.presence
  }),
  reducers = spacetimedb.exportGroup({
    ...chatCrud.exports,
    ...messageCrud.exports,
    ...presenceFns.exports
  })

export { reducers }
export default spacetimedb
```

### Chat component

```typescript
'use client'

import { useTable, useReducer } from 'spacetimedb/react'
import { useList, usePresence } from 'betterspace/react'
import { tables, reducers } from '@/generated/module_bindings'

const ChatRoom = ({ chatId }: { chatId: number }) => {
  // Subscribe to messages for this chat
  const [allMessages, messagesReady] = useTable(
    tables.message.where(r => r.chatId.eq(chatId))
  )
  const { data: messages } = useList(allMessages, messagesReady, {
    sort: { field: 'id', direction: 'asc' },
  })

  // Presence
  const [presenceRows] = useTable(tables.presence)
  const heartbeat = useReducer(reducers.presence_heartbeat_presence)
  const { users } = usePresence(
    presenceRows,
    async () => heartbeat({ roomId: String(chatId) }),
  )

  const createMessage = useReducer(reducers.create_message)

  const handleSend = async (content: string) => {
    await createMessage({ chatId, content })
  }

  return (
    <div>
      <div>
        {users.length} online
      </div>
      <ul>
        {messages.map(msg => (
          <li key={msg.id}>{msg.content}</li>
        ))}
      </ul>
      <MessageInput onSend={handleSend} />
    </div>
  )
}
```

* * *

## File upload with S3 pre-signed URLs

Upload files to MinIO/S3 and register them in SpacetimeDB.

### API route

```typescript
// app/api/upload/presign/route.ts
import { createS3UploadPresignedUrl } from 'betterspace/server'
import { NextResponse } from 'next/server'

export const POST = async (req: Request) => {
  const { filename, contentType } = (await req.json()) as {
    filename: string
    contentType: string
    size: number
  }

  const key = `uploads/${crypto.randomUUID()}-${filename}`

  const presigned = await createS3UploadPresignedUrl({
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    bucket: process.env.S3_BUCKET!,
    endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region: process.env.S3_REGION ?? 'us-east-1',
    key,
    contentType,
    expiresInSeconds: 900
  })

  return NextResponse.json({
    uploadUrl: presigned.url,
    storageKey: key,
    headers: presigned.headers,
    method: 'PUT'
  })
}
```

### Upload component

```typescript
'use client'

import { useUpload } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const FileUploader = () => {
  const registerUpload = useReducer(reducers.register_upload_file)

  const { upload, isUploading, progress, error } = useUpload({
    registerFile: async ({ contentType, filename, size, storageKey }) => {
      await registerUpload({ contentType, filename, size, storageKey })
      return { storageId: storageKey }
    },
  })

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await upload(file)
    if (!result.ok) console.error('Upload failed:', result.code)
  }

  return (
    <div>
      <input type="file" onChange={handleChange} disabled={isUploading} />
      {isUploading && <span>{progress}%</span>}
      {error && <span>Error: {error}</span>}
    </div>
  )
}
```

* * *

## Org-scoped data access

Projects and tasks that belong to an org, with member-only write access.

### Schema

```typescript
const project = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      name: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  projectCrud = makeOrgCrud(spacetimedb, {
    fields: { name: t.string() },
    idField: t.u32(),
    orgIdField: t.u32(),
    orgMemberTable: db => db.orgMember,
    pk: tbl => tbl.id,
    table: db => db.project,
    tableName: 'project'
  })
```

### Client

```typescript
'use client'

import { useTable, useReducer } from 'spacetimedb/react'
import { useList, useOrg, useOrgMutation } from 'betterspace/react'
import { tables, reducers } from '@/generated/module_bindings'

const ProjectList = () => {
  const { org } = useOrg()
  const [allProjects, isReady] = useTable(tables.project)

  // Filter to this org client-side
  const { data: projects } = useList(allProjects, isReady, {
    where: { orgId: org.id },
    sort: { field: 'updatedAt', direction: 'desc' },
  })

  // useOrgMutation injects orgId automatically
  const createProject = useOrgMutation(useReducer(reducers.create_project))

  return (
    <div>
      <button onClick={() => createProject({ name: 'New project' })}>
        New project
      </button>
      <ul>
        {projects.map(p => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

* * *

## Cache with external API (movie app pattern)

Cache third-party API responses in SpacetimeDB with TTL-based invalidation.

### Schema

```typescript
const movie = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      tmdbId: t.u32().unique(),
      title: t.string(),
      overview: t.string(),
      voteAverage: t.number(),
      cachedAt: t.timestamp(),
      invalidatedAt: t.timestamp().optional(),
      updatedAt: t.timestamp()
    }
  ),
  movieCrud = makeCacheCrud(spacetimedb, {
    fields: {
      title: t.string(),
      overview: t.string(),
      voteAverage: t.number()
    },
    keyField: t.number(),
    keyName: 'tmdbId',
    pk: tbl => tbl.tmdbId,
    table: db => db.movie,
    tableName: 'movie',
    options: { ttl: 7 * 24 * 60 * 60 * 1000 }
  })
```

### Next.js API route for cache population

Since `ctx.http.fetch()` panics in local Docker, use a Next.js API route to fetch from
the external API and populate the cache:

```typescript
// app/api/movies/[tmdbId]/route.ts
import { NextResponse } from 'next/server'

const STDB_URL = process.env.SPACETIMEDB_URL ?? 'http://localhost:3000'
const MODULE = process.env.MODULE_NAME ?? 'my-app'
const TMDB_API_KEY = process.env.TMDB_API_KEY!

export const GET = async (
  _req: Request,
  { params }: { params: { tmdbId: string } }
) => {
  const tmdbId = Number(params.tmdbId)

  // Check cache first via SQL API
  const cacheRes = await fetch(`${STDB_URL}/v1/database/${MODULE}/sql`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: `SELECT * FROM movie WHERE tmdb_id = ${tmdbId} AND invalidated_at IS NULL LIMIT 1`
  })
  const [cacheResult] = (await cacheRes.json()) as [{ rows: unknown[][] }]

  if (cacheResult.rows.length > 0) {
    // Cache hit: return cached data
    return NextResponse.json({ source: 'cache', data: cacheResult.rows[0] })
  }

  // Cache miss: fetch from TMDB
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
  )
  const movie = (await tmdbRes.json()) as {
    id: number
    title: string
    overview: string
    vote_average: number
  }

  // Store in SpacetimeDB cache via reducer
  // (Call the reducer via HTTP or WebSocket)
  // For simplicity, use the SQL API to insert directly
  // In production, call the reducer via the SDK

  return NextResponse.json({ source: 'api', data: movie })
}
```

### Client-side cache display

```typescript
'use client'

import { useTable } from 'spacetimedb/react'
import { useList } from 'betterspace/react'
import { tables } from '@/generated/module_bindings'

const MovieList = () => {
  const [movies, isReady] = useTable(tables.movie)
  const { data } = useList(movies, isReady, {
    where: { invalidatedAt: undefined },  // only valid cache entries
    sort: { field: 'voteAverage', direction: 'desc' },
  })

  return (
    <ul>
      {data.map(movie => (
        <li key={movie.id}>
          {movie.title} ({movie.voteAverage.toFixed(1)})
        </li>
      ))}
    </ul>
  )
}
```

* * *

## Soft delete with restore

Use `softDelete: true` in `makeCrud` to set `deletedAt` instead of deleting rows.

### Schema

```typescript
const wiki = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      title: t.string(),
      content: t.string().optional(),
      deletedAt: t.timestamp().optional(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  wikiCrud = makeOrgCrud(spacetimedb, {
    fields: {
      title: t.string(),
      content: t.string().optional(),
      deletedAt: t.timestamp().optional()
    },
    idField: t.u32(),
    orgIdField: t.u32(),
    orgMemberTable: db => db.orgMember,
    pk: tbl => tbl.id,
    table: db => db.wiki,
    tableName: 'wiki',
    options: { softDelete: true }
  })
```

### Client: filter out deleted rows

```typescript
const { data: activeWikis } = useList(wikis, isReady, {
  where: { deletedAt: undefined }
})

const { data: deletedWikis } = useList(wikis, isReady, {
  where: { deletedAt: { $gt: 0 } } // has a deletedAt value
})
```

### Restore: update deletedAt back to null

```typescript
const updateWiki = useReducer(reducers.update_wiki)

const restore = async (id: number) => {
  await updateWiki({ id, deletedAt: null })
}
```

* * *

## Post-mutation workflows with onSuccess and onSettled

Run side effects after a mutation completes — redirect, reset form state, show a toast.

```typescript
'use client'

import { useMutate } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { useRouter } from 'next/navigation'
import { reducers } from '@/generated/module_bindings'

const CreatePostForm = () => {
  const router = useRouter()
  const createPost = useReducer(reducers.create_post)

  const save = useMutate(createPost, {
    onSuccess: (_result, args) => {
      // Redirect after successful create
      router.push('/posts')
    },
    onSettled: (_args, error) => {
      // Always runs — clean up loading state
      setSubmitting(false)
      if (error) console.error('Create failed:', error)
    }
  })

  return (
    <form onSubmit={async e => {
      e.preventDefault()
      const form = new FormData(e.currentTarget)
      await save({
        title: form.get('title') as string,
        content: form.get('content') as string,
        published: false
      })
    }}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit">Create</button>
    </form>
  )
}
```

`onSettled` fires whether the mutation succeeds or fails.
Use it for cleanup that must always happen (clearing spinners, resetting flags).
Use `onSuccess` for actions that only make sense on success (redirects, toasts).

* * *

## Typing components with InferRow, InferCreate, InferUpdate

Derive prop types from your schema brands instead of duplicating type definitions.

```typescript
import type { InferRow, InferCreate, InferUpdate } from 'betterspace/server'
import { makeOwned } from 'betterspace/schema'
import { z } from 'zod/v4'

const postSchema = makeOwned(z.object({
  title: z.string(),
  content: z.string(),
  published: z.boolean()
}))

type PostRow = InferRow<typeof postSchema>
type PostCreate = InferCreate<typeof postSchema>
type PostUpdate = InferUpdate<typeof postSchema>

// Use in component props
const PostCard = ({ post }: { post: PostRow }) => (
  <div>
    <h2>{post.title}</h2>
    <p>{post.content}</p>
    <span>{post.published ? 'Published' : 'Draft'}</span>
  </div>
)

const CreatePostForm = ({ onSubmit }: { onSubmit: (data: PostCreate) => void }) => {
  // ...
}

const EditPostForm = ({ post, onSubmit }: { post: PostRow; onSubmit: (data: PostUpdate) => void }) => {
  // ...
}
```

`InferRow` includes the database-added fields (`_id`, `_creationTime`, `updatedAt`,
`userId` for owned schemas).
`InferCreate` is the raw field shape — what you pass to the create reducer.
`InferUpdate` makes all fields optional — what you pass to the update reducer.

* * *

## Global error type with Register

Use declaration merging to set a project-wide default error type.
All betterspace hooks and utilities will use your type instead of the default `Error`.

```typescript
// types/betterspace.d.ts
declare module 'betterspace/server' {
  interface Register {
    defaultError: AppError
  }
}

// Your error type
interface AppError {
  code: string
  message: string
  requestId?: string
}
```

After augmenting `Register`, `RegisteredDefaultError` resolves to `AppError`:

```typescript
import type { RegisteredDefaultError } from 'betterspace/server'

const handleError = (error: RegisteredDefaultError) => {
  // error.code, error.message, error.requestId are all typed
  console.error(`[${error.requestId}] ${error.code}: ${error.message}`)
}
```

* * *

## Create and update forms with schemaVariants

Define one base schema and derive both create and update variants from it.

```typescript
import { schemaVariants } from 'betterspace/zod'
import { z } from 'zod/v4'

const postSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content must be at least 10 characters'),
  published: z.boolean()
})

// create: all fields required
// update: all fields optional (title stays required here)
const { create: createSchema, update: updateSchema } = schemaVariants(postSchema, ['title'])

// Create form
const CreatePost = () => {
  const createPost = useReducer(reducers.create_post)
  const form = useForm({
    schema: createSchema,
    onSubmit: async ({ value }) => {
      await createPost(value)
    }
  })
  return (
    <Form form={form}>
      <fields.Text name="title" required />
      <fields.Text name="content" multiline required />
      <fields.Toggle name="published" trueLabel="Published" />
      <fields.Submit>Create</fields.Submit>
    </Form>
  )
}

// Edit form — same schema, update variant
const EditPost = ({ post }: { post: PostRow }) => {
  const updatePost = useReducer(reducers.update_post)
  const form = useForm({
    schema: updateSchema,
    defaultValues: { title: post.title, content: post.content, published: post.published },
    onSubmit: async ({ value }) => {
      await updatePost({ id: post.id, ...value })
    }
  })
  return (
    <Form form={form}>
      <fields.Text name="title" required />
      <fields.Text name="content" multiline />
      <fields.Toggle name="published" trueLabel="Published" />
      <fields.Submit>Save</fields.Submit>
    </Form>
  )
}
```

* * *

## Typed form validation errors with getFieldErrors

Surface server-side field validation errors back into your form UI.

```typescript
'use client'

import { getFieldErrors } from 'betterspace/server'
import { useMutate } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { useState } from 'react'
import { reducers } from '@/generated/module_bindings'
import { z } from 'zod/v4'

const postSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(10),
  published: z.boolean()
})

const CreatePost = () => {
  const createPost = useReducer(reducers.create_post)
  const [fieldErrors, setFieldErrors] = useState<Partial<{ title: string; content: string }>>({})

  const save = useMutate(createPost, {
    onError: error => {
      const errors = getFieldErrors<typeof postSchema>(error)
      if (errors) {
        setFieldErrors(errors)
        return
      }
      // Fall through to default toast for non-field errors
    }
  })

  return (
    <form onSubmit={async e => {
      e.preventDefault()
      setFieldErrors({})
      const form = new FormData(e.currentTarget)
      await save({
        title: form.get('title') as string,
        content: form.get('content') as string,
        published: false
      })
    }}>
      <div>
        <input name="title" />
        {fieldErrors.title && <p className="text-red-500">{fieldErrors.title}</p>}
      </div>
      <div>
        <textarea name="content" />
        {fieldErrors.content && <p className="text-red-500">{fieldErrors.content}</p>}
      </div>
      <button type="submit">Create</button>
    </form>
  )
}
```

`getFieldErrors` returns `undefined` when the error has no field-level data, so you can
safely fall through to a generic error handler.

* * *

## Reducing mutation boilerplate with useMutation

`useMutation` combines `useReducer` + `useMutate` into one call, removing the
intermediate variable.

Before:

```typescript
import { useMutate } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const raw = useReducer(reducers.update_blog)
const save = useMutate(raw, { onSuccess: () => toast.success('Saved') })
```

After:

```typescript
import { useMutation } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const save = useMutation(useReducer, reducers.update_blog, {
  onSuccess: () => toast.success('Saved')
})
```

All `MutateOptions` work the same way — `onSuccess`, `onSettled`, `onError`, `retry`,
`optimistic`, etc.

* * *

## Toast shorthand with useMutation

The `toast` option on `useMutate`/`useMutation` replaces manual `onSuccess`/`onError`
callbacks when all you need is a message.

Before:

```typescript
import { useMutation } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const save = useMutation(useReducer, reducers.update_blog, {
  onSuccess: () => toast.success('Saved'),
  onError: () => toast.error('Save failed')
})
```

After:

```typescript
import { useMutation } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const save = useMutation(useReducer, reducers.update_blog, {
  toast: { success: 'Saved', error: 'Save failed' }
})
```

`fieldErrors` defaults to `true` — if the server returns field validation errors, the
first one is toasted before the generic `error` message.
Set `fieldErrors: false` to skip that behavior.

Dynamic messages work too:

```typescript
const save = useMutation(useReducer, reducers.update_blog, {
  toast: {
    success: (result, args) => `"${args.title}" saved`,
    error: err =>
      `Save failed: ${err instanceof Error ? err.message : 'unknown'}`
  }
})
```

`onSuccess` and `toast.success` compose — both run when provided.

* * *

## Field validation error toasts

Use `toastFieldError` to surface the first field validation error as a toast, then fall
back to a generic message for non-field errors.

```typescript
'use client'

import { toastFieldError } from 'betterspace/react'
import { useMutation } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const BlogEditor = () => {
  const save = useMutation(useReducer, reducers.update_blog, {
    onError: error => {
      if (!toastFieldError(error, toast.error)) {
        toast.error('Something went wrong')
      }
    }
  })

  const handleSubmit = async (data: { id: number; title: string; content: string }) => {
    await save(data)
  }

  return <form onSubmit={...}>{...}</form>
}
```

`toastFieldError` returns `true` when it toasted a field error, so the `if` block only
runs for other error types.
Pair it with `getFieldErrors` when you need to display errors inline in the form rather
than as toasts.

* * *

## Phantom type inference

Branded schemas expose `$inferRow`, `$inferCreate`, and `$inferUpdate` as readable
properties. No import needed — just use `typeof schema.$inferRow`.

```typescript
import { makeOwned } from 'betterspace/schema'
import { z } from 'zod/v4'

const postSchema = makeOwned(
  z.object({
    title: z.string(),
    content: z.string(),
    published: z.boolean()
  })
)

type PostRow = typeof postSchema.$inferRow
type PostCreate = typeof postSchema.$inferCreate
type PostUpdate = typeof postSchema.$inferUpdate
```

`PostRow` includes the database-added fields (`_id`, `_creationTime`, `updatedAt`,
`userId` for owned schemas).
This is equivalent to `InferRow<typeof postSchema>` but skips the import.

The `~types` accessor groups all three:

```typescript
type PostTypes = (typeof postSchema)['~types']
type PostRow = PostTypes['row']
type PostCreate = PostTypes['create']
type PostUpdate = PostTypes['update']
```

Use these in component props to stay in sync with the schema without duplicating type
definitions:

```typescript
const PostCard = ({ post }: { post: typeof postSchema.$inferRow }) => (
  <div>
    <h2>{post.title}</h2>
    <p>{post.content}</p>
  </div>
)
```

* * *

## Error discrimination with SenderError.\_tag

`SenderError` carries `_tag: 'SenderError'` as a const property.
Use it to narrow errors in catch blocks when you need to distinguish betterspace reducer
errors from other thrown values.

```typescript
import { extractErrorData } from 'betterspace/server'

try {
  await save(data)
} catch (e) {
  if (e instanceof Error && '_tag' in e && e._tag === 'SenderError') {
    const data = extractErrorData(e)
    if (data?.code === 'CONFLICT') {
      showConflictDialog(data)
      return
    }
  }
  throw e
}
```

For most cases, `handleError` or `matchError` is simpler — they parse the error
internally without the `_tag` check.
Use `_tag` when you need to re-throw non-betterspace errors or integrate with an
external error boundary that inspects error shape.
