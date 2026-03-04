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
    userId: t.identity().index(),
  }
),

message = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    chatId: t.u32().index(),
    content: t.string(),
    updatedAt: t.timestamp(),
    userId: t.identity().index(),
  }
),

presence = table(
  { public: true },
  {
    id: t.u32().autoInc().primaryKey(),
    roomId: t.string().index(),
    userId: t.identity().index(),
    data: t.string(),
    lastSeen: t.timestamp(),
  }
),

spacetimedb = schema({ chat, message, presence }),

chatCrud = makeCrud(spacetimedb, {
  fields: { title: t.string(), isPublic: t.bool() },
  idField: t.u32(),
  pk: tbl => tbl.id,
  table: db => db.chat,
  tableName: 'chat',
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
  tableName: 'message',
}),

presenceFns = makePresence(spacetimedb, {
  dataField: t.string(),
  roomIdField: t.string(),
  pk: tbl => tbl.id,
  table: db => db.presence,
}),

reducers = spacetimedb.exportGroup({
  ...chatCrud.exports,
  ...messageCrud.exports,
  ...presenceFns.exports,
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

---

## File upload with S3 pre-signed URLs

Upload files to MinIO/S3 and register them in SpacetimeDB.

### API route

```typescript
// app/api/upload/presign/route.ts
import { createS3UploadPresignedUrl } from 'betterspace/server'
import { NextResponse } from 'next/server'

export const POST = async (req: Request) => {
  const { filename, contentType } = await req.json() as {
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
    expiresInSeconds: 900,
  })

  return NextResponse.json({
    uploadUrl: presigned.url,
    storageKey: key,
    headers: presigned.headers,
    method: 'PUT',
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

---

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
    userId: t.identity().index(),
  }
),

projectCrud = makeOrgCrud(spacetimedb, {
  fields: { name: t.string() },
  idField: t.u32(),
  orgIdField: t.u32(),
  orgMemberTable: db => db.orgMember,
  pk: tbl => tbl.id,
  table: db => db.project,
  tableName: 'project',
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

---

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
    updatedAt: t.timestamp(),
  }
),

movieCrud = makeCacheCrud(spacetimedb, {
  fields: {
    title: t.string(),
    overview: t.string(),
    voteAverage: t.number(),
  },
  keyField: t.number(),
  keyName: 'tmdbId',
  pk: tbl => tbl.tmdbId,
  table: db => db.movie,
  tableName: 'movie',
  options: { ttl: 7 * 24 * 60 * 60 * 1000 },
})
```

### Next.js API route for cache population

Since `ctx.http.fetch()` panics in local Docker, use a Next.js API route to fetch from the external API and populate the cache:

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
    body: `SELECT * FROM movie WHERE tmdb_id = ${tmdbId} AND invalidated_at IS NULL LIMIT 1`,
  })
  const [cacheResult] = await cacheRes.json() as [{ rows: unknown[][] }]

  if (cacheResult.rows.length > 0) {
    // Cache hit: return cached data
    return NextResponse.json({ source: 'cache', data: cacheResult.rows[0] })
  }

  // Cache miss: fetch from TMDB
  const tmdbRes = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
  )
  const movie = await tmdbRes.json() as {
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

---

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
    userId: t.identity().index(),
  }
),

wikiCrud = makeOrgCrud(spacetimedb, {
  fields: {
    title: t.string(),
    content: t.string().optional(),
    deletedAt: t.timestamp().optional(),
  },
  idField: t.u32(),
  orgIdField: t.u32(),
  orgMemberTable: db => db.orgMember,
  pk: tbl => tbl.id,
  table: db => db.wiki,
  tableName: 'wiki',
  options: { softDelete: true },
})
```

### Client: filter out deleted rows

```typescript
const { data: activeWikis } = useList(wikis, isReady, {
  where: { deletedAt: undefined },
})

const { data: deletedWikis } = useList(wikis, isReady, {
  where: { deletedAt: { $gt: 0 } },  // has a deletedAt value
})
```

### Restore: update deletedAt back to null

```typescript
const updateWiki = useReducer(reducers.update_wiki)

const restore = async (id: number) => {
  await updateWiki({ id, deletedAt: null })
}
```
