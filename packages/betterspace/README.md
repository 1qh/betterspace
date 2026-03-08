# betterspace

Zod schema → fullstack app.
One schema, zero boilerplate.

Define a Zod schema once → authenticated CRUD reducers, typesafe forms with file upload,
real-time WebSocket subscriptions, pagination, search, conflict detection, soft delete,
org multi-tenancy with ACL, Row-Level Security via `clientVisibilityFilter` — all
generated. Ship a production app in minutes, not days.

SpacetimeDB runs server-side logic in-memory with WASM, so there’s no network hop
between your app logic and the database.
betterspace adds auto-generated indexes, bulk operation limits, rate limiting, input
sanitization, and Row-Level Security filters that minimize data transferred per
subscription. Together these make a single SpacetimeDB instance viable at very high user
counts without horizontal sharding.
See [Security & Scalability](docs/security.md) for architecture details.

## Before / After

A typical user-owned CRUD in raw SpacetimeDB:

```tsx
const createPost = spacetimedb.reducer(
  { name: 'create_post' },
  {
    title: t.string(),
    content: t.string(),
    category: t.string(),
    published: t.bool()
  },
  (ctx, args) => {
    ctx.db.blog.insert({
      id: 0,
      title: args.title,
      content: args.content,
      category: args.category,
      published: args.published,
      updatedAt: ctx.timestamp,
      userId: ctx.sender
    })
  }
)

const updatePost = spacetimedb.reducer(
  { name: 'update_post' },
  { id: t.u32(), title: t.string().optional(), content: t.string().optional() },
  (ctx, { id, ...fields }) => {
    const row = ctx.db.blog.id.find(id)
    if (!row || !identityEquals(row.userId, ctx.sender))
      throw new SenderError('NOT_FOUND')
    ctx.db.blog.id.update({ ...row, ...fields, updatedAt: ctx.timestamp })
  }
)

const deletePost = spacetimedb.reducer(
  { name: 'delete_post' },
  { id: t.u32() },
  (ctx, { id }) => {
    const row = ctx.db.blog.id.find(id)
    if (!row || !identityEquals(row.userId, ctx.sender))
      throw new SenderError('NOT_FOUND')
    ctx.db.blog.id.delete(id)
  }
)
```

~40 lines for 3 reducers.
No validation, no file cleanup, no conflict detection.

With betterspace `betterspace()`:

```tsx
import { betterspace } from 'betterspace/server'
import { s } from './t'

export default betterspace(({ table }) => ({
  blog: table(s.blog, { pub: 'published' })
}))
```

One call. `create`/`update`/`rm` reducers with auth, ownership, validation hooks, and
conflict detection — all included.

## Less Boilerplate, Same Capability

The backend for 4 production apps — blog, chat, org collaboration, and movie search —
stays compact consumer code while preserving typed reducers, auth checks, hooks, and
real-time subscriptions.

Here’s a full org-scoped CRUD with per-item editor permissions and soft delete:

```tsx
export default betterspace(({ table, t }) => ({
  wiki: table(s.wiki, {
    compoundIndex: ['orgId', 'slug'],
    extra: { editors: t.array(t.identity()).optional() },
    softDelete: true
  })
}))
```

One call. Role-based access, editor ACL, soft delete with restore, cascade delete
(default for org-scoped), compound indexes, auto-`deletedAt`, and bulk operations — all
generated.

> [See all backend code: packages/be/src/](https://github.com/1qh/betterspace/tree/main/packages/be/src)

## What You Get

| Feature                                                                                                                      | Lines of code |
| ---------------------------------------------------------------------------------------------------------------------------- | :-----------: |
| CRUD reducers with auth + ownership                                                                                          |       0       |
| Row-Level Security via `clientVisibilityFilter` (auto-generated from `pub` option)                                           |       0       |
| Real-time WebSocket subscriptions                                                                                            |       0       |
| File upload with S3/MinIO presign, auto-cleanup                                                                              |       0       |
| Typesafe forms with Zod validation                                                                                           |       0       |
| Conflict detection + resolution dialog                                                                                       |       0       |
| Soft delete + undo toast                                                                                                     |       0       |
| Bulk operations (select all, bulk delete/update)                                                                             |       0       |
| Org multi-tenancy with roles + ACL + invites                                                                                 |       0       |
| Optimistic mutations with auto-rollback                                                                                      |       0       |
| Auto-save with debounce + indicator                                                                                          |       0       |
| Multi-step forms with per-step validation                                                                                    |       0       |
| Singleton per-user data (profile, settings)                                                                                  |       0       |
| External API cache with TTL + auto-refresh                                                                                   |       0       |
| Branded types — compile-time factory mismatch prevention                                                                     |       0       |
| Typed error handling with discriminated result unions                                                                        |       0       |
| Unified CLI — 11 commands (`init`, `add`, `check`, `dev`, `docs`, `doctor`, `generate`, `migrate`, `use`, `validate`, `viz`) |       0       |
| Project health score (`betterspace check --health`)                                                                          |       0       |
| Schema preview (`betterspace check --schema`)                                                                                |       0       |
| Browser devtools panel (subscriptions, mutations, cache, errors)                                                             |       0       |
| Interactive schema playground component                                                                                      |       0       |
| Auto-derived field labels from field name                                                                                    |       0       |
| Default error toasts with smart routing (auth errors)                                                                        |       0       |
| Auto-mount devtools in dev mode (inside forms)                                                                               |       0       |
| File upload auto-detection + dev warning                                                                                     |       0       |
| Guarded API wrapper — runtime typo detection                                                                                 |       0       |
| Test utilities (`createTestContext`, `callReducer`, `queryTable`)                                                            |       0       |
| CLI scaffold with best-practice defaults                                                                                     |       0       |
| CLI table scaffolding (`betterspace add`) + interactive mode                                                                 |       0       |
| `setupCrud()` convenience wrapper for CRUD boilerplate reduction                                                             |       0       |
| `useList` text search (`search: { query, fields }`)                                                                          |       0       |
| `useList` debounced search (`search: { debounceMs }`)                                                                        |       0       |
| `useOwnRows` — per-row ownership flag with memoized predicate                                                                |       0       |
| `useMutate` retry with exponential backoff (`retry: number \| RetryOptions`)                                                 |       0       |
| `useBulkMutate` live progress tracking (`onProgress`, `BulkProgress`, `progress`)                                            |       0       |
| `partialValues(schema, values)` — fill update args without listing every field                                               |       0       |
| CLI `betterspace init` pre-flight checks (SpacetimeDB CLI + Docker)                                                          |       0       |
| 50+ named type exports from `betterspace/react`                                                                              |       0       |
| Provider utilities (`toWsUri`, `createTokenStore`, `createFileUploader`, `createSpacetimeClient`)                            |       0       |
| Live subscription data tracking in devtools                                                                                  |       0       |
| Descriptive branded type error messages (`AssertSchema`, `SchemaTypeError`)                                                  |       0       |
| ESLint plugin — 16 rules (`api-casing`, `form-field-exists`, `require-error-boundary`, ...)                                  |       0       |
| Pre-built components (ConflictDialog, AutoSaveIndicator, OfflineIndicator, PermissionGuard)                                  |       0       |
| React hooks (`useSearch`, `usePresence`, `useBulkSelection`, `useInfiniteList`, ...)                                         |       0       |
| Server middleware (`composeMiddleware`, `inputSanitize`, `auditLog`, `slowQueryWarn`)                                        |       0       |
| Next.js server utilities (`getToken`, `setActiveOrgCookie`, `makeImageRoute`)                                                |       0       |
| Real-time presence tracking (`usePresence`, `makePresence`, `presenceTable`)                                                 |       0       |
| Seed data generation (`generateOne`, `generateSeed`)                                                                         |       0       |
| Retry with exponential backoff (`withRetry`, `fetchWithRetry`)                                                               |       0       |
| Zod introspection (`unwrapZod`, `cvFileKindOf`, `defaultValues`, `enumToOptions`, ...)                                       |       0       |
| Client-safe Zod schemas (`@a/be/t`) — single source of truth for forms                                                       |       0       |
| Identity helpers (`identityEquals`, `identityFromHex`, `identityToHex`)                                                      |       0       |
| `zodFromTable` — bridge SpacetimeDB types to Zod schemas                                                                     |       0       |
| `useMutate` `onSuccess`/`onSettled` callbacks for post-mutation workflows                                                    |       0       |
| `useBulkMutate`/`useOptimisticMutation` `onSettled` callbacks                                                                |       0       |
| `useList` auto-reset pagination on filter/search change                                                                      |       0       |
| `useInfiniteList` search support (`search` option with `debounceMs`)                                                         |       0       |
| `disabled`/`helpText`/`required` props on all 14 field components                                                            |       0       |
| `TypedFieldErrors<S>` and `getFieldErrors<S>()` for typed form validation                                                    |       0       |
| `className` prop on `ErrorBoundary`                                                                                          |       0       |
| `betterspace validate` CLI command (alias for `check --health`)                                                              |       0       |
| `Register` interface with declaration merging for global error/meta types                                                    |       0       |
| `InferRow<S>`, `InferCreate<S>`, `InferUpdate<S>` — brand-aware type inference                                               |       0       |
| Phantom types on branded schemas (`schema.$inferRow`, `schema.$inferCreate`, `schema.$inferUpdate`, `schema['~types']`)      |       0       |
| `InferRows<T>` mapped type over schema records                                                                               |       0       |
| `InferReducerArgs`, `InferReducerReturn`, `InferReducerInputs`, `InferReducerOutputs`                                        |       0       |
| `schemaVariants()` — derive create/update schemas from one base schema                                                       |       0       |
| `injectError()` devtools function + error injection dropdown in devtools panel                                               |       0       |
| `useMutation` toast shorthand (`toast: { success, error }`) — eliminates mutation+toast boilerplate                          |       0       |
| Phantom type inference (`$inferRow`, `$inferCreate`, `$inferUpdate`, `~types`) on branded schemas                            |       0       |
| `SenderError._tag` discriminator for `instanceof`-free error discrimination                                                  |       0       |
| `z.prefault()`/`z.default()` integration in `defaultValues()` for smarter form defaults                                      |       0       |
| Structured error codes with descriptive `ERROR_MESSAGES` context                                                             |       0       |
| Shared list utilities (sort, search, filter) across `useList` and `useInfiniteList`                                          |       0       |
| `UndefinedToOptional<T>` type — makes `T \| undefined` fields optional, used by `useMutation` and `relax()`                  |       0       |
| `relax()` wrapper — applies `UndefinedToOptional` to raw `useReducer` calls for clean reducer invocations                    |       0       |
| Relaxed `useMutation` args — SpacetimeDB `T \| undefined` fields become optional, only pass fields you change                |       0       |

## Developer Tools

### Type Error Messages

Schema mismatches surface as clear compile-time errors with descriptive messages:

```tsx
// Without betterspace branded types:
//   "Type 'ZodObject<...>' is not assignable to 'ZodObject<...>'"

// With betterspace AssertSchema:
//   "Schema mismatch: expected OwnedSchema (from schema({ owned: ... })),
//    got OrgSchema (from schema({ orgScoped: ... }))."
```

Use `AssertSchema<T, Expected>` in your own code to enforce schema brands:

```tsx
import type {
  AssertSchema,
  DetectBrand,
  SchemaTypeError
} from 'betterspace/server'

type Validated = AssertSchema<typeof mySchema, 'owned'>
//   ✅ if mySchema is OwnedSchema → resolves to the schema type
//   ❌ if mySchema is OrgSchema → resolves to descriptive error string
```

### Browser Devtools Panel

In dev mode, the devtools panel auto-mounts inside `<Form>` components — no import
needed. The panel tracks:

- **Subscriptions**: Active queries with args, data preview, render count, result count,
  latency
- **Mutations**: Name, args, duration, status (pending/success/error)
- **Cache**: Table, key, hit/miss counts, stale state
- **Errors**: Full error details with retry info

Click any subscription row to expand and inspect its current args and data preview.

For standalone usage or customization:

```tsx
import { BetterspaceDevtools } from 'betterspace/react'
;<BetterspaceDevtools position="bottom-right" defaultTab="subs" />
```

### Schema Playground

Interactive component for previewing how schemas map to generated endpoints:

```tsx
import { SchemaPlayground } from 'betterspace/react'
;<SchemaPlayground className="my-8" />
```

### CLI: `betterspace doctor`

Run project-wide diagnostics with a health score:

```bash
betterspace doctor --schema-file=t.ts
```

Checks 7 categories: schema consistency, endpoint coverage, index coverage, access
levels, ESLint config, and dependency versions.
Outputs pass/warn/fail for each check with a health score from 0–100.

### CLI: `betterspace dev`

Start the integrated local development workflow:

```bash
betterspace dev
```

This command orchestrates local setup tasks used during day-to-day development.

### CLI: `betterspace add`

Scaffold a new table with schema, endpoint, and page component in one command:

```bash
betterspace add todo --fields="title:string,done:boolean"
betterspace add wiki --type=org --fields="title:string,content:string,status:enum(draft,published)"
betterspace add message --type=child --parent=chat --fields="text:string"
betterspace add profile --type=singleton --fields="displayName:string,bio:string?"
betterspace add movie --type=cache --fields="title:string,tmdb_id:number"
```

Generates schema definition, reducer config, and page component.
Skips existing files.
Supports all 5 table types (owned, org, singleton, cache, child) with field types
`string`, `boolean`, `number`, and `enum()`.

When you run `betterspace add` with no table name in a TTY, it enters interactive mode
and prompts for type, parent table (for child tables), and fields.

### React provider utilities

`betterspace/react` exports provider helpers to reduce setup boilerplate:

- `toWsUri(uri)` converts `http(s)` endpoints to `ws(s)` endpoints
- `createTokenStore(key?)` persists auth tokens in localStorage + cookie
- `createFileUploader(presignEndpoint)` builds a `FileApi` uploader from a presign
  endpoint
- `createSpacetimeClient({ DbConnection, uri, moduleName, tokenStore })` builds and
  caches a configured builder

### ESLint Plugin

16 rules to catch common mistakes at lint time:

```js
import { recommended } from 'betterspace/eslint'

export default [recommended]
```

| Rule                               | Severity | What it catches                                    |
| ---------------------------------- | -------- | -------------------------------------------------- |
| `api-casing`                       | error    | Wrong casing in API references                     |
| `discovery-check`                  | warn     | Could not find schema or module directory          |
| `consistent-crud-naming`           | error    | CRUD export name doesn’t match table               |
| `form-field-exists`                | error    | `<Text name='typo' />` — field not in schema       |
| `form-field-kind`                  | warn     | `<Text>` on boolean field (should be `<Toggle>`)   |
| `no-duplicate-crud`                | error    | Same table registered in two `crud()` calls        |
| `no-empty-search-config`           | error    | `search: {}` with no field or index                |
| `no-raw-fetch-in-server-component` | warn     | `fetch()` in server component (use API route)      |
| `no-unlimited-file-size`           | warn     | File upload without size limit                     |
| `no-unprotected-mutation`          | warn     | Mutation without rate limiting                     |
| `no-unsafe-api-cast`               | warn     | Bypassing guard wrapper                            |
| `prefer-useList`                   | warn     | Raw query where `useList` fits                     |
| `prefer-useOrgQuery`               | warn     | Query where `useOrgQuery` fits                     |
| `require-connection`               | error    | Missing `await connection()` before `preloadQuery` |
| `require-error-boundary`           | warn     | Page without `<ErrorBoundary>`                     |
| `require-rate-limit`               | warn     | `crud()` without `rateLimit` option                |

## Install

```bash
bun add betterspace
```

## Entry Points

| Import                      | What’s inside                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `betterspace`               | `guardApi`, `strictApi`, `zodFromTable`, identity helpers, server types (`InferCreate`, `InferRow`, `OrgRole`, `CrudResult`, ...)                                                                                                                                                                                                                                                                                          |
| `betterspace/schema`        | `schema`, `child`, `cvFile`, `cvFiles` (legacy: `makeOwned`, `makeOrgScoped`, `makeBase`, `makeSingleton`, `orgSchema`)                                                                                                                                                                                                                                                                                                    |
| `betterspace/server`        | `betterspace`, `table`, `setupCrud`, `setup`, CRUD factories, org helpers, middleware, error handling, test utilities                                                                                                                                                                                                                                                                                                      |
| `betterspace/react`         | `useMut`, `useMutation`, `useMutate`, `useList`, `useOwnRows`, `useSearch`, `usePresence`, `useBulkSelection`, `useBulkMutate`, `useInfiniteList`, `useUpload`, `useSoftDelete`, `useCacheEntry`, `useOptimisticMutation`, `useErrorToast`, `relax`, `createOrgHooks`, `toWsUri`, `createTokenStore`, `createFileUploader`, `createSpacetimeClient`, `BetterspaceDevtools`, `SchemaPlayground`, org hooks, 50+ named types |
| `betterspace/components`    | `Form`, `useForm`, `useFormMutation`, `ConflictDialog`, `AutoSaveIndicator`, `OfflineIndicator`, `PermissionGuard`, `ErrorBoundary`, `FileApiProvider`, `OrgAvatar`, `RoleBadge`, `EditorsSection`, `defineSteps`, 14 typed field components                                                                                                                                                                               |
| `betterspace/next`          | `getToken`, `isAuthenticated`, `setActiveOrgCookie`, `clearActiveOrgCookie`, `getActiveOrg`, `makeImageRoute`                                                                                                                                                                                                                                                                                                              |
| `betterspace/eslint`        | `plugin`, `recommended`, 16 lint rules                                                                                                                                                                                                                                                                                                                                                                                     |
| `betterspace/zod`           | `unwrapZod`, `cvFileKindOf`, `defaultValues`, `enumToOptions`, `pickValues`, `coerceOptionals`, `partialValues`                                                                                                                                                                                                                                                                                                            |
| `betterspace/test`          | `createTestContext`, `asUser`, `callReducer`, `queryTable`, `isTestMode`                                                                                                                                                                                                                                                                                                                                                   |
| `betterspace/test/discover` | `discoverModules`                                                                                                                                                                                                                                                                                                                                                                                                          |
| `betterspace/seed`          | `generateOne`, `generateSeed`, `generateFieldValue`                                                                                                                                                                                                                                                                                                                                                                        |
| `betterspace/retry`         | `withRetry`, `fetchWithRetry`                                                                                                                                                                                                                                                                                                                                                                                              |
| `betterspace/s3`            | `createS3UploadPresignedUrl`, `createS3DownloadPresignedUrl`                                                                                                                                                                                                                                                                                                                                                               |

## Type Safety

Every API surface is type-checked at compile time.
Typos are caught before your code runs.

### Branded schemas prevent mismatches

```tsx
table(s.blog, { pub: 'published' }) // ✅ 'published' exists in schema
table(s.blog, { pub: 'typo' }) // ❌ compile error — 'typo' not in schema
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
// packages/be/t.ts — client-safe Zod schemas
const s = schema({
  owned: {
    blog: object({
      title: string().min(1, 'Required'),
      content: string().min(3, 'At least 3 characters'),
      category: zenum(['tech', 'life', 'tutorial']),
      published: boolean(),
      coverImage: cvFile().nullable().optional()
    })
  }
})

// Forms use the same schemas — validation rules flow end-to-end
const form = useForm({ schema: s.blog, onSubmit: ... })
```

## Quick Start

### 1. Field definitions (`t.ts`)

> [Real example: packages/be/t.ts](https://github.com/1qh/betterspace/blob/main/packages/be/t.ts)

```tsx
import { schema } from 'betterspace/schema'
import { boolean, object, string } from 'zod/v4'

const s = schema({
  owned: {
    blog: object({
      title: string().min(1),
      content: string().min(3),
      published: boolean()
    })
  },
  singleton: {
    profile: object({ displayName: string(), bio: string().optional() })
  }
})

export { s }
```

### 2. Backend module (`src/index.ts`)

```tsx
import { betterspace } from 'betterspace/server'
import { s } from '../t'

export default betterspace(({ table }) => ({
  blog: table(s.blog, { pub: 'published' }),
  profile: table(s.profile)
}))
```

`betterspace()` builds the schema, registers all CRUD reducers, and exports the module
in one call. For fine-grained control, use `setup()` directly (see
[API Reference](docs/api-reference.md)).

### 3. Publish the module

```bash
bun spacetime:publish
```

### 4. Use in React

```tsx
const { data: blogs, loadMore } = useList(allBlogs, isReady, {
  where: { published: true }
})
```

## Zero-Config Defaults

Everything works out of the box.
Opt out only when needed.

| Default             | What it does                                                                  | Opt out                                          |
| ------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| Auto-derived labels | `coverImage` renders as “Cover Image”                                         | `label={false}` or `label="Custom"`              |
| Error toasts        | `useMutate` and forms show toast on error                                     | `onError: false`                                 |
| Toast shorthand     | `useMut(reducers.create, { toast: { success: 'Created', error: 'Failed' } })` | Omit `toast`                                     |
| Devtools panel      | Auto-mounts in dev mode inside forms                                          | Manual `<BetterspaceDevtools>` for customization |
| File upload warning | Console warning if file fields lack `<FileApiProvider>`                       | Add the provider                                 |
| Form data return    | Forms auto-return submitted data for reset                                    | Return custom data from `onSubmit`               |
| Devtools tracking   | Mutations, subscriptions, and cache tracked in dev panel                      | Dev mode only                                    |

`bunx betterspace init` scaffolds new projects with all defaults pre-configured: guarded
API wrapper, `FileApiProvider`, `ErrorBoundary`, and commented middleware examples.
It also auto-installs dependencies and creates `tsconfig.json` — no manual setup needed.

## 5 Table Types

| Type        | Schema                    | Factory                          | Use Case                               |
| ----------- | ------------------------- | -------------------------------- | -------------------------------------- |
| `owned`     | Table fields              | `table(owned.x)`                 | User-owned data (blog posts, chats)    |
| `orgScoped` | Table fields + orgId      | `table(orgScoped.x)`             | Org-scoped data (wikis, projects)      |
| `children`  | Table fields + foreignKey | `table(children.x)`              | Nested under parent (messages in chat) |
| `base`      | Table fields + cacheKey   | `table(base.x, { key: 'name' })` | External API cache with TTL            |
| `singleton` | Table fields              | `table(singleton.x)`             | 1:1 per-user data (profile, settings)  |

## Demo Apps

4 real-world web apps showcase betterspace in production use:

| App                                                              | What it shows                                        | Backend                                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Movie](https://github.com/1qh/betterspace/tree/main/apps/movie) | Cache factory, TMDB integration, no-auth             | [src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/src/index.ts) |
| [Blog](https://github.com/1qh/betterspace/tree/main/apps/blog)   | Owned CRUD, forms, file upload, pagination, profile  | [src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/src/index.ts) |
| [Chat](https://github.com/1qh/betterspace/tree/main/apps/chat)   | Child CRUD, public/auth split, AI streaming          | [src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/src/index.ts) |
| [Org](https://github.com/1qh/betterspace/tree/main/apps/org)     | Multi-tenancy, ACL, soft delete, invites, onboarding | [src/index.ts](https://github.com/1qh/betterspace/blob/main/packages/be/src/index.ts) |

### Test Coverage

| Platform | Framework                   | Tests |
| -------- | --------------------------- | ----: |
| Web      | Playwright E2E              |   220 |
| Backend  | SpacetimeDB test utilities  |    17 |
| Library  | bun:test (`src/__tests__/`) |  1091 |

## Documentation

| Guide                                        | What’s covered                                                                                                                                                                                                                                                          |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Quickstart](docs/quickstart.md)             | From zero to running app in 5 minutes                                                                                                                                                                                                                                   |
| [Forms](docs/forms.md)                       | Typesafe forms, multi-step wizards, auto-save, conflict detection, async validation                                                                                                                                                                                     |
| [Data Fetching](docs/data-fetching.md)       | Real-time subscriptions, filtering, pagination, search                                                                                                                                                                                                                  |
| [Organizations](docs/organizations.md)       | orgCrud, ACL, cascade delete, invites, join requests, org hooks                                                                                                                                                                                                         |
| [Custom Queries](docs/custom-queries.md)     | Custom reducers alongside CRUD, migration guide                                                                                                                                                                                                                         |
| [Testing](docs/testing.md)                   | `createTestContext`, `asUser`, `callReducer`, `queryTable` patterns                                                                                                                                                                                                     |
| [API Reference](docs/api-reference.md)       | All exports, error codes, file upload, known limitations                                                                                                                                                                                                                |
| [Migration](docs/migration.md)               | Coming from lazyconvex — concept mapping and incremental adoption                                                                                                                                                                                                       |
| [Schema Evolution](docs/schema-evolution.md) | Adding, renaming, removing fields, type changes, deployment strategies                                                                                                                                                                                                  |
| [Ejecting](docs/ejecting.md)                 | Gradual replacement of factories with raw SpacetimeDB, what you lose/keep                                                                                                                                                                                               |
| [Security & Scalability](docs/security.md)   | Row-Level Security (RLS), `pub` option, write-side access control, org ACL, scaling model, chunk pattern, data lifecycle                                                                                                                                                |
| [Recipes](docs/recipes.md)                   | 15 real-world composition patterns: chat, file upload, org+ACL, caching, soft delete, mutation workflows, typed components, global error types, schemaVariants, field validation, useMutation, toast shorthand, field error toasts, phantom types, error discrimination |

## Contributing

The library is independently testable without the demo apps:

```bash
cd packages/betterspace
bun test src/__tests__/  # 1091 library-only tests, no SpacetimeDB needed
bun lint          # library-scoped linting
bun typecheck     # library-only type checking
```

Repo-wide commands (`bun fix`, `bun test:all`) include all 4 demo apps and take longer.
For library-only changes, the commands above are sufficient.

Run `bunx betterspace check` from any consumer project to validate schema/factory
consistency.
