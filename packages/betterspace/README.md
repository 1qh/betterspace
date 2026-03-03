# betterspace

Zod schema → fullstack app. One schema, zero boilerplate.

Define a Zod schema once → authenticated CRUD reducers, typesafe forms with file upload, real-time WebSocket subscriptions, pagination, search, conflict detection, soft delete, org multi-tenancy with ACL — all generated. Ship a production app in minutes, not days.

## Before / After

A typical user-owned CRUD in raw SpacetimeDB:

```tsx
const createPost = spacetimedb.reducer(
  { name: 'create_post' },
  { title: t.string(), content: t.string(), category: t.string(), published: t.bool() },
  (ctx, args) => {
    ctx.db.blog.insert({
      id: 0,
      title: args.title,
      content: args.content,
      category: args.category,
      published: args.published,
      updatedAt: ctx.timestamp,
      userId: ctx.sender,
    })
  }
)

const updatePost = spacetimedb.reducer(
  { name: 'update_post' },
  { id: t.u32(), title: t.string().optional(), content: t.string().optional() },
  (ctx, { id, ...fields }) => {
    const row = ctx.db.blog.id.find(id)
    if (!row || !identityEquals(row.userId, ctx.sender)) throw new SenderError('NOT_FOUND')
    ctx.db.blog.id.update({ ...row, ...fields, updatedAt: ctx.timestamp })
  }
)

const deletePost = spacetimedb.reducer(
  { name: 'delete_post' },
  { id: t.u32() },
  (ctx, { id }) => {
    const row = ctx.db.blog.id.find(id)
    if (!row || !identityEquals(row.userId, ctx.sender)) throw new SenderError('NOT_FOUND')
    ctx.db.blog.id.delete(id)
  }
)
```

~40 lines for 3 reducers. No validation, no file cleanup, no conflict detection.

With betterspace:

```tsx
const blogCrud = makeCrud(spacetimedb, {
  fields: { category: t.string(), content: t.string(), coverImage: t.string().optional(),
    published: t.bool(), title: t.string() },
  idField: t.u32(), pk: tbl => tbl.id, table: db => db.blog, tableName: 'blog'
})
```

4 lines. 8 reducers. Auth, ownership, Zod validation, file upload with auto-cleanup, conflict detection, author enrichment — all included.

## 471 Lines → 93 Reducers

The entire backend for 4 production apps — blog, chat, org collaboration, and movie search — is **471 lines of consumer code**. That's schemas, setup, and module files combined. Those 471 lines produce **93 fully typed, authenticated reducers**.

Here's a full org-scoped CRUD with per-item editor permissions and soft delete:

```tsx
const wikiCrud = makeOrgCrud(spacetimedb, {
  fields: { content: t.string().optional(), deletedAt: t.timestamp().optional(),
    editors: t.array(t.identity()).optional(), slug: t.string(),
    status: t.string(), title: t.string() },
  idField: t.u32(), orgIdField: t.u32(), options: { softDelete: true },
  orgMemberTable: db => db.orgMember, pk: tbl => tbl.id,
  table: db => db.wiki, tableName: 'wiki'
})
```

One config. 12 reducers. Role-based access, editor ACL, soft delete with restore, bulk operations — all generated.

> [See all backend code: packages/be/spacetimedb/src/](https://github.com/1qh/betterspace/tree/main/packages/be/spacetimedb/src)

## What You Get

| Feature | Lines of code |
|---------|:---:|
| CRUD reducers with auth + ownership | 0 |
| Real-time WebSocket subscriptions | 0 |
| File upload with S3/MinIO presign, auto-cleanup | 0 |
| Typesafe forms with Zod validation | 0 |
| Conflict detection + resolution dialog | 0 |
| Soft delete + undo toast | 0 |
| Bulk operations (select all, bulk delete/update) | 0 |
| Org multi-tenancy with roles + ACL + invites | 0 |
| Optimistic mutations with auto-rollback | 0 |
| Auto-save with debounce + indicator | 0 |
| Multi-step forms with per-step validation | 0 |
| Singleton per-user data (profile, settings) | 0 |
| External API cache with TTL + auto-refresh | 0 |
| Branded types — compile-time factory mismatch prevention | 0 |
| Typed error handling with discriminated result unions | 0 |
| Unified CLI — 7 commands (`init`, `add`, `check`, `doctor`, `codegen`, `docs`, `migrate`) | 0 |
| Project health score (`betterspace check --health`) | 0 |
| Schema preview (`betterspace check --schema`) | 0 |
| Browser devtools panel (subscriptions, mutations, cache, errors) | 0 |
| Interactive schema playground component | 0 |
| Auto-derived field labels from field name | 0 |
| Default error toasts with smart routing (auth errors) | 0 |
| Auto-mount devtools in dev mode (inside forms) | 0 |
| File upload auto-detection + dev warning | 0 |
| Guarded API wrapper — runtime typo detection | 0 |
| Test utilities (`createTestContext`, `callReducer`, `queryTable`) | 0 |
| CLI scaffold with best-practice defaults | 0 |
| CLI table scaffolding (`betterspace add`) | 0 |
| Live subscription data tracking in devtools | 0 |
| Descriptive branded type error messages (`AssertSchema`, `SchemaTypeError`) | 0 |
| ESLint plugin — 16 rules (`api-casing`, `form-field-exists`, `require-error-boundary`, ...) | 0 |
| Pre-built components (ConflictDialog, AutoSaveIndicator, OfflineIndicator, PermissionGuard) | 0 |
| React hooks (`useSearch`, `usePresence`, `useBulkSelection`, `useInfiniteList`, ...) | 0 |
| Server middleware (`composeMiddleware`, `inputSanitize`, `auditLog`, `slowQueryWarn`) | 0 |
| Next.js server utilities (`getToken`, `setActiveOrgCookie`, `makeImageRoute`) | 0 |
| Real-time presence tracking (`usePresence`, `makePresence`, `presenceTable`) | 0 |
| Seed data generation (`generateOne`, `generateSeed`) | 0 |
| Retry with exponential backoff (`withRetry`, `fetchWithRetry`) | 0 |
| Zod introspection (`unwrapZod`, `cvFileKindOf`, `defaultValues`, `enumToOptions`, ...) | 0 |
| Client-safe Zod schemas (`@a/be/z`) — single source of truth for forms | 0 |
| Identity helpers (`identityEquals`, `identityFromHex`, `identityToHex`) | 0 |
| `zodFromTable` — bridge SpacetimeDB types to Zod schemas | 0 |

## Developer Tools

### Type Error Messages

Schema mismatches surface as clear compile-time errors with descriptive messages:

```tsx
// Without betterspace branded types:
//   "Type 'ZodObject<...>' is not assignable to 'ZodObject<...>'"

// With betterspace AssertSchema:
//   "Schema mismatch: expected OwnedSchema (from makeOwned()),
//    got OrgSchema (from makeOrgScoped())."
```

Use `AssertSchema<T, Expected>` in your own code to enforce schema brands:

```tsx
import type { AssertSchema, DetectBrand, SchemaTypeError } from 'betterspace/server'

type Validated = AssertSchema<typeof mySchema, 'owned'>
//   ✅ if mySchema is OwnedSchema → resolves to the schema type
//   ❌ if mySchema is OrgSchema → resolves to descriptive error string
```



### Browser Devtools Panel

In dev mode, the devtools panel auto-mounts inside `<Form>` components — no import needed. The panel tracks:

- **Subscriptions**: Active queries with args, data preview, render count, result count, latency
- **Mutations**: Name, args, duration, status (pending/success/error)
- **Cache**: Table, key, hit/miss counts, stale state
- **Errors**: Full error details with retry info

Click any subscription row to expand and inspect its current args and data preview.

For standalone usage or customization:



```tsx
import { BetterspaceDevtools } from 'betterspace/react'

<BetterspaceDevtools position='bottom-right' defaultTab='subs' />
```

### Schema Playground

Interactive component for previewing how schemas map to generated endpoints:



```tsx
import { SchemaPlayground } from 'betterspace/react'

<SchemaPlayground className='my-8' />
```

### CLI: `betterspace doctor`

Run project-wide diagnostics with a health score:

```bash
betterspace doctor --schema-file=t.ts
```

Checks 7 categories: schema consistency, endpoint coverage, index coverage, access levels, ESLint config, and dependency versions. Outputs pass/warn/fail for each check with a health score from 0–100.

### CLI: `betterspace add`

Scaffold a new table with schema, endpoint, and page component in one command:

```bash
betterspace add todo --fields="title:string,done:boolean"
betterspace add wiki --type=org --fields="title:string,content:string,status:enum(draft,published)"
betterspace add message --type=child --parent=chat --fields="text:string"
betterspace add profile --type=singleton --fields="displayName:string,bio:string?"
betterspace add movie --type=cache --fields="title:string,tmdb_id:number"
```

Generates schema definition, reducer config, and page component. Skips existing files. Supports all 5 table types (owned, org, singleton, cache, child) with field types `string`, `boolean`, `number`, and `enum()`.

### ESLint Plugin

16 rules to catch common mistakes at lint time:

```js
import { recommended } from 'betterspace/eslint'

export default [recommended]
```

| Rule | Severity | What it catches |
|------|----------|----------------|
| `api-casing` | error | Wrong casing in API references |
| `discovery-check` | warn | Could not find schema or module directory |
| `consistent-crud-naming` | error | CRUD export name doesn't match table |
| `form-field-exists` | error | `<Text name='typo' />` — field not in schema |
| `form-field-kind` | warn | `<Text>` on boolean field (should be `<Toggle>`) |
| `no-duplicate-crud` | error | Same table registered in two `crud()` calls |
| `no-empty-search-config` | error | `search: {}` with no field or index |
| `no-raw-fetch-in-server-component` | warn | `fetch()` in server component (use API route) |
| `no-unlimited-file-size` | warn | File upload without size limit |
| `no-unprotected-mutation` | warn | Mutation without rate limiting |
| `no-unsafe-api-cast` | warn | Bypassing guard wrapper |
| `prefer-useList` | warn | Raw query where `useList` fits |
| `prefer-useOrgQuery` | warn | Query where `useOrgQuery` fits |
| `require-connection` | error | Missing `await connection()` before `preloadQuery` |
| `require-error-boundary` | warn | Page without `<ErrorBoundary>` |
| `require-rate-limit` | warn | `crud()` without `rateLimit` option |

## Install

```bash
bun add betterspace
```

## Entry Points

| Import | What's inside |
|--------|--------------|
| `betterspace` | `guardApi`, `strictApi`, `zodFromTable`, identity helpers |
| `betterspace/schema` | `makeOwned`, `makeOrgScoped`, `makeBase`, `makeSingleton`, `child`, `cvFile`, `cvFiles`, `orgSchema` |
| `betterspace/server` | `makeCrud`, `makeChildCrud`, `makeOrgCrud`, `makeSingletonCrud`, `makeCacheCrud`, `makeOrg`, `makeFileUpload`, `makePresence`, table helpers, middleware, error handling, test utilities |
| `betterspace/react` | `useList`, `useSearch`, `usePresence`, `useBulkSelection`, `useMutate`, `useInfiniteList`, `useUpload`, `useSoftDelete`, `useCacheEntry`, `useOptimisticMutation`, `useErrorToast`, `BetterspaceDevtools`, `SchemaPlayground`, org hooks |
| `betterspace/components` | `Form`, `ConflictDialog`, `AutoSaveIndicator`, `OfflineIndicator`, `PermissionGuard`, `ErrorBoundary`, `FileApiProvider`, `OrgAvatar`, `RoleBadge`, `EditorsSection`, `defineSteps` |
| `betterspace/next` | `getToken`, `isAuthenticated`, `setActiveOrgCookie`, `clearActiveOrgCookie`, `getActiveOrg`, `makeImageRoute` |
| `betterspace/eslint` | `plugin`, `recommended`, 16 lint rules |
| `betterspace/zod` | `unwrapZod`, `cvFileKindOf`, `defaultValues`, `enumToOptions`, `pickValues`, `coerceOptionals` |
| `betterspace/test` | `createTestContext`, `asUser`, `callReducer`, `queryTable`, `isTestMode` |
| `betterspace/test/discover` | `discoverModules` |
| `betterspace/seed` | `generateOne`, `generateSeed`, `generateFieldValue` |
| `betterspace/retry` | `withRetry`, `fetchWithRetry` |

## Type Safety

Every API surface is type-checked at compile time. Typos are caught before your code runs.

### Branded schemas prevent mismatches

```tsx
makeCrud(spacetimedb, { ... })      // ✅ compiles with owned table
makeOrgCrud(spacetimedb, { ... })   // ✅ compiles with org-scoped table
```

### Form fields are type-checked by value type

```tsx
<Text name='title' />       // ✅ title is string
<Text name='published' />   // ❌ compile error — published is boolean
<Toggle name='published' /> // ✅ published is boolean
<File name='coverImage' />  // ✅ coverImage is cvFile()
<File name='title' />       // ❌ compile error — title is not a file field
```

### Zod schemas as single source of truth

```tsx
// packages/be/z.ts — client-safe Zod schemas
const owned = {
  blog: object({
    title: string().min(1, 'Required'),
    content: string().min(3, 'At least 3 characters'),
    category: zenum(['tech', 'life', 'tutorial']),
    published: boolean(),
    coverImage: cvFile().nullable().optional()
  })
}

// Forms use the same schemas — validation rules flow end-to-end
const form = useForm({ schema: owned.blog, onSubmit: ... })
```

## Quick Start

### 1. Define table schemas

> [Real example: packages/be/t.ts](https://github.com/1qh/betterspace/blob/main/packages/be/t.ts)

```tsx
import { t } from 'spacetimedb/server'

const owned = {
  blog: {
    category: t.string(),
    content: t.string(),
    coverImage: t.string().optional(),
    published: t.bool(),
    title: t.string()
  }
}
```

### 2. Define SpacetimeDB tables + generate reducers

```tsx
import { makeCrud } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

const blog = table({ public: true }, {
  category: t.string(), content: t.string(), coverImage: t.string().optional(),
  id: t.u32().autoInc().primaryKey(), published: t.bool().index(),
  title: t.string(), updatedAt: t.timestamp(), userId: t.identity().index()
})

const spacetimedb = schema({ blog })

const blogCrud = makeCrud(spacetimedb, {
  fields: owned.blog, idField: t.u32(), pk: tbl => tbl.id,
  table: db => db.blog, tableName: 'blog'
})

export const reducers = spacetimedb.exportGroup({ ...blogCrud.exports })
export default spacetimedb
```

### 3. Publish the module

```bash
bun spacetime:publish
```

### 4. Use in React

```tsx
const { data: blogs, loadMore } = useList(allBlogs, isReady, { where: { published: true } })
```

## Zero-Config Defaults

Everything works out of the box. Opt out only when needed.

| Default | What it does | Opt out |
|---------|-------------|---------|
| Auto-derived labels | `coverImage` renders as "Cover Image" | `label={false}` or `label="Custom"` |
| Error toasts | `useMutate` and forms show toast on error | `onError: false` |
| Devtools panel | Auto-mounts in dev mode inside forms | Manual `<BetterspaceDevtools>` for customization |
| File upload warning | Console warning if file fields lack `<FileApiProvider>` | Add the provider |
| Form data return | Forms auto-return submitted data for reset | Return custom data from `onSubmit` |
| Devtools tracking | Mutations, subscriptions, and cache tracked in dev panel | Dev mode only |

`bunx betterspace init` scaffolds new projects with all defaults pre-configured: guarded API wrapper, `FileApiProvider`, `ErrorBoundary`, and commented middleware examples.

## 5 Table Types

| Type | Schema | Factory | Use Case |
|------|--------|---------|----------|
| `owned` | Table fields | `makeCrud()` | User-owned data (blog posts, chats) |
| `orgScoped` | Table fields + orgId | `makeOrgCrud()` | Org-scoped data (wikis, projects) |
| `children` | Table fields + foreignKey | `makeChildCrud()` | Nested under parent (messages in chat) |
| `base` | Table fields + cacheKey | `makeCacheCrud()` | External API cache with TTL |
| `singleton` | Table fields | `makeSingletonCrud()` | 1:1 per-user data (profile, settings) |

## Demo Apps

4 real-world web apps showcase betterspace in production use:

| App | What it shows | Backend |
|-----|---------------|---------|
| [Movie](https://github.com/1qh/betterspace/tree/main/apps/movie) | Cache factory, TMDB integration, no-auth | [spacetimedb/src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/spacetimedb/src/index.ts) |
| [Blog](https://github.com/1qh/betterspace/tree/main/apps/blog) | Owned CRUD, forms, file upload, pagination, profile | [spacetimedb/src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/spacetimedb/src/index.ts) |
| [Chat](https://github.com/1qh/betterspace/tree/main/apps/chat) | Child CRUD, public/auth split, AI streaming | [spacetimedb/src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/spacetimedb/src/index.ts) |
| [Org](https://github.com/1qh/betterspace/tree/main/apps/org) | Multi-tenancy, ACL, soft delete, invites, onboarding | [spacetimedb/src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/spacetimedb/src/index.ts) |

### Test Coverage

| Platform | Framework | Tests |
|----------|-----------|------:|
| Web | Playwright E2E | 220 |
| Backend | SpacetimeDB test utilities | 219 |
| Library | bun:test | 900 |

## Documentation

| Guide | What's covered |
|-------|---------------|
| [Quickstart](docs/quickstart.md) | From zero to running app in 5 minutes |
| [Forms](docs/forms.md) | Typesafe forms, multi-step wizards, auto-save, conflict detection, async validation |
| [Data Fetching](docs/data-fetching.md) | Real-time subscriptions, filtering, pagination, search |
| [Organizations](docs/organizations.md) | orgCrud, ACL, cascade delete, invites, join requests, org hooks |
| [Custom Queries](docs/custom-queries.md) | Custom reducers alongside CRUD, migration guide |
| [Testing](docs/testing.md) | `createTestContext`, `asUser`, `callReducer`, `queryTable` patterns |
| [API Reference](docs/api-reference.md) | All exports, error codes, file upload, known limitations |
| [Migration](docs/migration.md) | Coming from lazyconvex — concept mapping and incremental adoption |
| [Schema Evolution](docs/schema-evolution.md) | Adding, renaming, removing fields, type changes, deployment strategies |
| [Ejecting](docs/ejecting.md) | Gradual replacement of factories with raw SpacetimeDB, what you lose/keep |
| [Recipes](docs/recipes.md) | 7 real-world composition patterns: blog+files, org+ACL, custom queries, presence, multi-step forms |

## Contributing

The library is independently testable without the demo apps:

```bash
cd packages/betterspace
bun test          # 900 library-only tests, no SpacetimeDB needed
bun lint          # library-scoped linting
bun typecheck     # library-only type checking
```

Repo-wide commands (`bun fix`, `bun test:all`) include all 4 demo apps and take longer. For library-only changes, the commands above are sufficient.

Run `bunx betterspace check` from any consumer project to validate schema/factory consistency.
