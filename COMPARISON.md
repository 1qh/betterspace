# betterspace vs lazyconvex — DX Gap Tracker

> This document tracks every DX gap between betterspace (SpacetimeDB) and lazyconvex
> (Convex), with the goal of **zero gap**. Developers moving from lazyconvex to
> betterspace should feel the same — or better — DX.

## Platform Context

betterspace targets SpacetimeDB, lazyconvex targets Convex.
Some differences are inherent:

- SpacetimeDB uses `t.*` type builders for column definitions; Convex derives columns
  from Zod
- SpacetimeDB data flows via WebSocket subscriptions; Convex uses per-query functions
- SpacetimeDB IDs are `u32` auto-increment; Convex IDs are strings
- SpacetimeDB has no built-in file storage; Convex has built-in storage

These platform differences are NOT gaps — they’re expected divergences documented in
PLAN.md. The gaps below are DX shortcomings where betterspace requires MORE boilerplate
or LESS capability than lazyconvex for equivalent functionality.

---

## Gap 1: CRUD Factories Require Field Redefinition (4x → 2x)

**Status**: [x] CLOSED

**lazyconvex**: Define fields ONCE in `t.ts`, reuse everywhere:

```ts
// t.ts — single source of truth
const owned = makeOwned({
  blog: object({ title: string(), content: string() })
})

// schema.ts — derives table from schema
blog: ownedTable(owned.blog)

// blog.ts — CRUD from same schema
const { create, rm } = crud('blog', owned.blog)
```

**betterspace (after)**: Fields defined TWICE (minimum for SpacetimeDB):

```ts
// t.ts — SpacetimeDB type builders (single source for DB types)
const owned = { blog: { title: t.string(), content: t.string() } }

// tables.ts — table() with spread + system fields
const blog = table(
  { public: true },
  {
    ...owned.blog,
    id: t.u32().autoInc().primaryKey(),
    published: t.bool().index(),
    updatedAt: t.timestamp(),
    userId: t.identity().index()
  }
)

// blog.ts — CRUD reuses same t.ts fields
const blogCrud = crud('blog', owned.blog)
```

**Resolution**: CRUD factories accept `t.ts` field objects directly.
Table definitions use spreads from `t.ts` + system fields.
Fields defined 2x total (t.ts + z.ts) — the platform minimum since SpacetimeDB `t.*`
types and Zod serve different purposes.

---

## Gap 2: No Custom Reducer Factories (m, q, pq)

**Status**: [x] CLOSED

**lazyconvex**: `setup()` returns `q`, `m`, `pq` — custom builders with auth baked in.

**betterspace**: `setupCrud()` returns `m()` — authenticated reducer factory with auth
baked in. SpacetimeDB doesn’t have “queries” (data comes via subscriptions), so only
`m()` is needed — not `q` or `pq`.

```ts
const { crud, m } = setupCrud(spacetimedb, defaults)

const togglePublish = m(
  'toggle_publish_blog',
  { id: t.u32() },
  (ctx, { id }) => {
    // ctx.sender guaranteed (auth checked by m())
  }
)
```

**Resolution**: `m()` already existed in `setupCrud` return value (setup.ts lines
549-561). Registers into `allExports()` automatically.

---

## Gap 3: No Per-Table File Separation

**Status**: [x] CLOSED

**lazyconvex**: Each table has its own file — CRUD + custom endpoints co-located.

**betterspace (after)**: 2-file backend — Zod schemas shared with frontend, single
`betterspace()` call for all tables:

```
packages/be/spacetimedb/
├── t.ts              (shared Zod schemas — 95 lines)
└── src/
    └── index.ts      (single betterspace() call — 31 lines)
```

**Resolution**: The `betterspace()` convenience function replaced the old 10-file
structure. All table definitions, CRUD registration, org setup, and module export happen
in one call.
Consumer backend went from ~222 lines across 10 files to 31 lines in 1 file.

---

## Gap 4: Org Cascade Requires Manual Callbacks

**Status**: [x] CLOSED

**lazyconvex**: Table names only:

```ts
setup({ orgCascadeTables: ['task', 'project'] })
```

**betterspace (after)**: Table names only, like lazyconvex:

```ts
const orgFns = org(orgFields.team, {
  cascadeTables: ['task', 'project', 'wiki'],
  t
})
```

**Resolution**: The simplified `org()` in `setupCrud` derives `deleteById` and
`rowsByOrg` callbacks from string table names automatically.
Library knows all org-scoped tables have `orgId` and `id` columns by convention.
Consumer went from 24+ lines of manual callbacks to a single `cascadeTables` array.

---

## Gap 5: Missing Org Helper Exports

**Status**: [x] CLOSED

**lazyconvex exports**: `canEdit`, `getOrgMember`, `getOrgRole`, `requireOrgMember`,
`requireOrgRole`, `orgCascade`

**betterspace exports**: `canEdit`, `requireOrgMember` from `org-crud-helpers.ts`,
`checkMembership`, `requireCanMutate` from `org-crud.ts`, `orgCascade` from helpers.

**Resolution**: All helpers already existed and were exported from the library barrel
(`betterspace/server`). No code changes needed — just verified the exports were
available.

---

## Gap 6: No uniqueCheck Helper

**Status**: [x] CLOSED

**lazyconvex**: One-liner for slug uniqueness:

```ts
const isSlugAvailable = uniqueCheck(orgScoped.wiki, 'wiki', 'slug')
```

**betterspace**: Equivalent one-liner:

```ts
const isSlugAvailable = makeUnique('wiki', 'slug')
```

**Resolution**: `makeUnique` already existed in `helpers.ts` and was re-exported from
the library barrel.

---

## Gap 7: makeOrg Requires Verbose Manual Configuration

**Status**: [x] CLOSED

**lazyconvex**: 2-line setup:

```ts
const s = setup({ orgSchema: org.team, orgCascadeTables: ['task', 'project'] })
const orgFns = s.org // done
```

**betterspace (after)**: 4-line setup via `setupCrud.org()`:

```ts
const { org } = setupCrud(spacetimedb, defaults)
const orgFns = org(orgFields.team, {
  cascadeTables: ['task', 'project', 'wiki'],
  t
})
```

**Resolution**: Added simplified `org()` to `setupCrud` return value (setup.ts).
The library derives `builders` (knows org reducer parameter types), table accessors
(from schema via `tblOf()`), and cascade callbacks (from string table names via
`dbTable()`). Consumer went from 50+ lines of manual config to 4 lines.

---

## Gap 8: Manual Export Assembly

**Status**: [x] CLOSED

**lazyconvex**: Each file exports its own functions.
Convex discovers them automatically.

**betterspace (after)**: Automatic collection:

```ts
const reducers = spacetimedb.exportGroup(allExports())
```

**Resolution**: `setupCrud()` accumulates all exports via internal `registerExports()`.
Every factory (`crud`, `orgCrud`, `childCrud`, `cacheCrud`, `singletonCrud`, `org`,
`fileUpload`, `m`) registers its exports automatically.
Consumer calls `allExports()` once at the end.

---

## Gap 9: Schema Definition Verbosity (4.5x → 2.8x → 0.7x)

**Status**: [x] CLOSED

**lazyconvex**: 46-line `schema.ts` using `ownedTable()`, `orgTable()` helpers:

```ts
import { ownedTable, orgTable, singletonTable } from 'lazyconvex/server'

const blog = ownedTable(owned.blog, { published: v.boolean() })
const project = orgTable(orgScoped.project)
```

**betterspace (before)**: 205-line `tables.ts` with manual `table()` calls repeating
system fields (`id`, `updatedAt`, `userId`, `orgId`) on every table.

**betterspace (intermediate)**: 127-line `tables.ts` using `makeSchema()` helpers.

**betterspace (after)**: 31-line `src/index.ts` using `betterspace()`:

```ts
import { betterspace } from 'betterspace/server'
import { owned, orgScoped, singleton } from '../../t'

export default betterspace(
  ({ ownedTable, orgScopedTable, singletonTable, t }) => ({
    blog: ownedTable(owned.blog, { published: t.bool().index() }),
    project: orgScopedTable(orgScoped.project),
    blogProfile: singletonTable(singleton.blogProfile)
  })
)
```

**Resolution**: `betterspace()` replaces both `makeSchema()` (table definitions) and
`setupCrud()` (CRUD registration).
It accepts `{ t, table }` internally via dependency injection, wraps helpers with
category tags so CRUD registration is automatic, and calls `registerAll()`, `org()`, and
`exportGroup()` without any consumer involvement.

Consumer backend went from 205 lines to 31 lines.
The 31-line backend covers all 11 tables across 4 demo apps.

---

## Gap 10: Reducer Calls Require `key: undefined` Boilerplate

**Status**: [x] CLOSED

**Problem**: SpacetimeDB generates types where optional fields are `T | undefined` but
REQUIRED:

```ts
type UpdateBlogParams = {
  id: number
  title: string | undefined
  content: string | undefined
  coverImage: string | undefined
  published: boolean | undefined
  expectedUpdatedAt: number | undefined
}
```

Every update call needed explicit `undefined` for every omitted field:

```ts
// BEFORE: 6 fields, only 2 meaningful
updateBlog({
  id,
  published: !published,
  title: undefined,
  content: undefined,
  coverImage: undefined,
  expectedUpdatedAt: undefined
})
```

With tables having many columns this becomes untenable.

**lazyconvex**: No issue — Convex mutations accept partial objects naturally.

**betterspace (after)**: `UndefinedToOptional<T>` type transformation + relaxed
`useMutation` and `relax()` utility:

```ts
// AFTER: only meaningful fields
updateBlog({ id, published: !published })
```

**How it works**:

1. `UndefinedToOptional<T>` — type-level transformation that makes `T | undefined`
   fields optional:

   ```ts
   // { id: number; title: string | undefined } → { id: number; title?: string | undefined }
   type UndefinedToOptional<T> = {
     [K in keyof T as undefined extends T[K] ? never : K]: T[K]
   } & {
     [K in keyof T as undefined extends T[K] ? K : never]?: T[K]
   } extends infer U
     ? { [K in keyof U]: U[K] }
     : never
   ```

2. `useMutation` — returns relaxed args automatically:

   ```ts
   const updateBlog = useMutation(useReducer, reducers.updateBlog)
   updateBlog({ id, published: true }) // only required + changed fields
   ```

3. `relax()` — for direct `useReducer` calls outside `useMutation`:

   ```ts
   const updateTask = relax(useReducer(reducers.updateTask))
   updateTask({ id, completed: true }) // same clean API
   ```

**Why it’s safe at runtime**: SpacetimeDB’s serializer (`algebraic_type.ts`) accesses
`value.fieldName` for each schema field.
Missing JS keys return `undefined`, which serializes as `None`. Both `null` and
`undefined` are treated as `None`.

**Impact across demo apps**:

| App          | Before                                                                          | After                                               |
| ------------ | ------------------------------------------------------------------------------- | --------------------------------------------------- |
| blog edit    | `partialValues(editBlog, { id, published, expectedUpdatedAt: undefined, ... })` | `editBlog({ id, published: !published })`           |
| org tasks    | `partialValues(taskUpdate, { id, completed, assigneeId: undefined, ... })`      | `taskUpdate({ id, completed: !current.completed })` |
| org projects | `partialValues(projectUpdate, { ...d, editors: undefined, ... })`               | `projectUpdate({ ...d, expectedUpdatedAt, id })`    |
| org wiki     | `{ ...d, deletedAt: undefined, editors: undefined, orgId }`                     | `{ ...d, orgId }`                                   |
| org settings | `{ ...d, avatarId: undefined, orgId }`                                          | `{ ...d, orgId }`                                   |
| movie fetch  | `createMovie(partialValues(base.movie, loadedMovie))`                           | `createMovie(loadedMovie)`                          |

---

## Gap 11: Schema Variants Boilerplate

**Status**: [x] CLOSED

**Problem**: Org app’s `schema.ts` was 44 lines due to `schemaVariants()` creating
`.create`/`.update` variants for each schema, plus manual extraction of variants.
Blog app similarly used `schemaVariants` unnecessarily.

**lazyconvex**: 20-line `schema.ts` — uses the SAME schema for both create and edit
forms. Edit forms are pre-filled with `pickValues()` so all fields have values.

**betterspace (before)**:

```ts
import { schemaVariants } from 'betterspace/zod'

const projectVariants = schemaVariants(orgScoped.project)
const projectCreate = projectVariants.create
const projectUpdate = projectVariants.update
// ... repeated for wiki, orgTeam
```

44 lines with 6 extra variant exports.

**betterspace (after)**:

```ts
const { project: projectSchema, wiki: wikiSchema } = orgScoped,
  project = projectSchema,
  wiki = wikiSchema
    .omit({ content: true })
    .extend({ content: string().optional() })
```

24 lines, no variant exports.
Edit forms use the base schema with `pickValues()` to pre-fill values (same pattern as
lazyconvex).

Blog schema similarly simplified from `schemaVariants(owned.blog)` to direct
`owned.blog.omit(...)` / `owned.blog.partial()`:

```ts
const createBlog = owned.blog.omit({ published: true }),
  editBlog = owned.blog.partial()
```

**Resolution**: Removed `schemaVariants` from all demo apps.
Edit forms use the base schema directly + `pickValues()` for pre-filling.
`schemaVariants` remains in the library as a public API for consumers who need it.

---

## Gap 12: Leftover `key: undefined` Boilerplate

**Status**: [x] CLOSED

**Problem**: After Gap 10’s `UndefinedToOptional + relax()` eliminated most
`key: undefined` boilerplate, one instance remained:

```ts
await createTask({
  assigneeId: undefined,
  completed: false,
  orgId: Number(org._id),
  priority,
  projectId: pid,
  title
})
```

**After**: The `relax()` wrapper already makes `assigneeId` optional, so it can simply
be omitted:

```ts
await createTask({
  completed: false,
  orgId: Number(org._id),
  priority,
  projectId: pid,
  title
})
```

**Resolution**: Removed the leftover `assigneeId: undefined` from project detail page.

---

## Gap 13: `getName` Boilerplate in `useMutation`

**Status**: [x] CLOSED

**Problem**: Every `useMutation` call required a `getName` option so devtools tracking
and toast messages could identify the mutation:

```ts
const create = useMutation(useReducer, reducers.createBlog, {
  getName: () => 'blog.create',
  toast: { error: 'Create failed', success: 'Created' }
})
```

The `getName` was always a static string derived from the reducer name — pure
boilerplate.

**lazyconvex**: No equivalent — Convex mutations are identified by their `api.blog.rm`
reference.

**betterspace (after)**: `useMutation` auto-infers the name from the SpacetimeDB reducer
descriptor’s `accessorName` or `name` field:

```ts
const create = useMutation(useReducer, reducers.createBlog, {
  toast: { error: 'Create failed', success: 'Created' }
})
```

**How it works**:

SpacetimeDB reducer descriptors (`UntypedReducerDef`) carry both `name` (snake_case:
`"create_blog"`) and `accessorName` (camelCase: `"createBlog"`). The new
`inferReducerName()` function extracts whichever is available:

```ts
const inferReducerName = (reducer: unknown): string | undefined => {
  if (typeof reducer === 'object' && reducer !== null) {
    const r = reducer as Record<string, unknown>
    if (typeof r.accessorName === 'string') return r.accessorName
    if (typeof r.name === 'string') return r.name
  }
}
```

`useMutation` uses this automatically when no explicit `getName` is provided.
Dynamic `getName` (with template literal IDs like `` `org.invite:${orgId}` ``) still
works by overriding the auto-inferred name.

**Impact across demo apps**:

- 15 static `getName` calls removed across 10 files
- 11 dynamic `getName` calls intentionally kept (they use runtime IDs for tracking)

---

## Gap 14: `null` Not Accepted for Optional Reducer Fields

**Status**: [x] CLOSED

**Problem**: Zod forms with `.nullable()` fields produce `null` values, but SpacetimeDB
reducer types define optional fields as `T | undefined`. This forced manual
`?? undefined` conversions and `partialValues()` usage everywhere:

```ts
await create({
  coverImage: d.coverImage ?? undefined, // Zod gives null, reducer wants undefined
  title: d.title,
  content: d.content
  // ...8 fields manually mapped
})

await update(partialValues(editBlog, { ...d, id: blog.id })) // null → undefined
```

**lazyconvex**: No issue — Convex mutations accept `null` for optional fields.

**betterspace (after)**: `UndefinedToOptional<T>` widened to accept `null` for optional
fields:

```ts
type UndefinedToOptional<T> = {
  [K in keyof T as undefined extends T[K] ? K : never]?: T[K] | null // ← added | null
} & {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K]
}
```

Now consumers can spread form data directly:

```ts
await create({ ...d, published: false }) // was 8 lines of manual mapping
await update({ ...d, id: blog.id }) // was partialValues(editBlog, ...)
await upsert(d) // was partialValues(profileSchema, d)
```

**Why it’s safe**: SpacetimeDB’s serializer (`algebraic_type.ts`) treats both `null` and
`undefined` as `None`. This was already documented in Gap 10 but the type didn’t reflect
it.

**Impact across demo apps**:

- 5 `?? undefined` conversions removed (blog, org onboarding, org join)
- 2 `partialValues` calls eliminated (blog edit, blog profile)
- Blog Create `onSubmit` went from 18 lines to 2 lines

---

## Gap 15: Redundant `toastFieldError` Try/Catch

**Status**: [x] CLOSED

**Problem**: Form `onSubmit` handlers wrapped mutation calls in try/catch with
`toastFieldError`, duplicating error handling already built into `useMutation`:

```ts
onSubmit: async d => {
  try {
    await create(payload)
  } catch (error) {
    toastFieldError(error, message => {
      toast.error(message)
    })
    throw error
  }
  return d
}
```

This caused **double-toasting**: `useMutation` already toasts field errors via
`toast.fieldErrors` (enabled by default), then the manual catch toasted again.

**lazyconvex**: No equivalent — Convex mutations don’t have built-in field error
toasting, so forms handle errors manually.

**betterspace (after)**: The try/catch is removed entirely.
`useMutation`’s built-in error handling covers all cases:

```ts
onSubmit: async d => {
  await create({ ...d, published: false })
  return d
}
```

**How it works**: `useMutation`’s `resolveToastError` checks for field errors first (via
`getFirstFieldError`), toasts them, then falls through to the `toast.error` message.
Errors are re-thrown so `useForm` can update its error state.
No manual handling needed.

**Impact across demo apps**:

- 3 redundant try/catch blocks removed (blog create, blog edit, blog profile)
- 3 `toastFieldError` imports removed
- 2 `partialValues` imports removed
- 2 `toast` (sonner) imports removed

---

## Gap 16: `useFormMutation` — Combined Mutation + Form Hook

**Status**: [x] CLOSED

**Problem**: Form pages required TWO hooks — `useMutation` for the reducer call and
`useForm` for form state — wired together in a manual `onSubmit`:

```tsx
const mutation = useMutation(useReducer, reducers.createWiki, {
    toast: { error: 'Failed', success: 'Created' }
  }),
  form = useForm({
    onSubmit: async d => {
      await mutation({ ...d, orgId: Number(org._id) })
      router.push('/wiki')
      return d
    },
    resetOnSuccess: true,
    schema: wiki
  })
```

**lazyconvex**: Uses `useFormMutation` — one hook, no `onSubmit` wiring:

```tsx
const form = useFormMutation({
  mutate: api.wiki.create,
  onSuccess: () => router.push('/wiki'),
  schema: wiki,
  transform: d => ({ ...d, orgId })
})
```

**betterspace (after)**: Same `useFormMutation` API, no wrapper needed (Gap 18
eliminated `relax()` for form mutations):

```tsx
const form = useFormMutation({
  mutate: useReducer(reducers.createWiki),
  onSuccess: () => {
    toast.success('Wiki page created')
    router.push('/wiki')
  },
  schema: wiki,
  transform: d => ({ ...d, orgId: Number(org._id) })
})
```

**Resolution**: The component-level `useFormMutation` was enhanced with a generic `M`
type parameter to work with typed reducer functions.
`resetOnSuccess` defaults to `true`. Form error handling is built in via
`defaultOnError` — no manual `toast.error` needed.

**Impact across demo apps**:

- 7 org app form pages refactored (wiki/new, wiki/edit, projects/new, projects/edit,
  invite-dialog, new org, settings)
- 3 blog app files refactored (common.tsx Create, edit/client.tsx Edit+Setting,
  profile/page.tsx)
- Each file saves 3-6 lines of hook setup boilerplate
- Eliminated double-toasting issue (useMutation toast + form defaultOnError)

---

## Gap 17: `useOrgMutation` — Auto-Inject `orgId` for Org Mutations

**Status**: [x] CLOSED

**Problem**: Every org-scoped mutation required manually converting `org._id` (string)
to `Number(org._id)` and spreading into the args:

```tsx
const mutation = useMutation(useReducer, reducers.orgUpdate, { toast: {...} })
await mutation({ ...d, orgId: Number(org._id) })
```

**lazyconvex**: `useOrgMutation` auto-injects `orgId`:

```tsx
const mutation = useOrgMutation(api.org.update)
await mutation(d) // orgId injected automatically
```

**betterspace (after)**: `createOrgHooks` returns a `useOrgMutation` that auto-injects
`orgId` with configurable transformation:

```tsx
// hook/use-org.tsx — one-time setup
const { useOrgMutation, useOrg } = createOrgHooks<Org & { _id: string }>({
  orgIdForMutation: Number
})

// settings/page.tsx — usage
const update = useOrgMutation(useReducer(reducers.orgUpdate))
await update(d) // orgId auto-injected as Number
```

**Resolution**: Enhanced `createOrgHooks` to accept an optional
`{ orgIdForMutation: (id: string) => unknown }` config.
The returned `useOrgMutation` wraps mutation functions to auto-inject the transformed
`orgId`. Standalone `useOrgMutation` (from `betterspace/react`) also made generic.

**Impact on org app settings page**:

- 3 mutations refactored from `useMutation(useReducer, ...)` to
  `useOrgMutation(useReducer(...))`
- Removed 9 lines of per-mutation toast/getName setup
- `orgId: Number(org._id)` no longer needed at call sites

---

## Gap 18: `relax()` Wrapper Tax on `useFormMutation`

**Status**: [x] CLOSED

**Problem**: Every `useFormMutation` call required wrapping the reducer with `relax()`
to bridge the type gap between SpacetimeDB’s `T | undefined` REQUIRED fields and Zod’s
truly optional fields:

```tsx
import { relax } from 'betterspace/react'

const createWiki = relax(useReducer(reducers.createWiki)),
  form = useFormMutation({
    mutate: createWiki,
    schema: wiki,
    transform: d => ({ ...d, orgId: Number(org._id) })
  })
```

This added 1 extra `const` line + 1 extra import per form page.

**lazyconvex**: No issue — Convex mutation types align with Zod output types.

**betterspace (after)**: `useFormMutation`’s `transform` return type changed from `M` to
`UndefinedToOptional<M>`, making the type relaxation happen INSIDE the hook:

```tsx
const form = useFormMutation({
  mutate: useReducer(reducers.createWiki),
  schema: wiki,
  transform: d => ({ ...d, orgId: Number(org._id) })
})
```

No `relax()` import, no intermediate variable.

**How it works**: The `transform` option’s return type was widened from `M` (the exact
reducer parameter type) to `UndefinedToOptional<M>` (where `T | undefined` fields become
optional). This lets consumers return objects with optional keys omitted, and
`useFormMutation` passes them through to the reducer where SpacetimeDB’s serializer
treats missing keys as `None`.

**Library changes**:

- `packages/betterspace/src/react/form.ts` —
  `transform?: (d: output<S>) => UndefinedToOptional<M>`
- `packages/betterspace/src/components/form.tsx` —
  `transform?: (d: zinfer<S>) => UndefinedToOptional<M>`

**Impact across demo apps**:

- 9 `useFormMutation` call sites: removed `relax()` wrapper + intermediate variable
- 1 `useForm` call site (org-settings-form): converted to `useFormMutation` with
  `slugRef` pattern for post-mutation cookie logic
- `relax` import removed from 9 files
- `relax()` still exists and is used by 1 non-form site (`useBulkMutate` in project
  detail page)

| File           | Before                                             | After                         |
| -------------- | -------------------------------------------------- | ----------------------------- |
| wiki/new       | `relax(useReducer(...))` + `mutate: createWiki`    | `mutate: useReducer(...)`     |
| wiki/edit      | `relax(useReducer(...))` + `mutate: update`        | `mutate: useReducer(...)`     |
| projects/new   | `relax(useReducer(...))` + `mutate: createProject` | `mutate: useReducer(...)`     |
| projects/edit  | `relax(useReducer(...))` + `mutate: update`        | `mutate: useReducer(...)`     |
| invite-dialog  | `relax(useReducer(...))` + `mutate: sendInvite`    | `mutate: useReducer(...)`     |
| new org        | `relax(useReducer(...))` + `mutate: create`        | `mutate: useReducer(...)`     |
| org settings   | `useForm` + `relax()` + manual onSubmit            | `useFormMutation` + transform |
| blog create    | `relax(useReducer(...))` + `mutate: createMut`     | `mutate: useReducer(...)`     |
| blog edit (2x) | `relax(useReducer(...))` + `mutate: updateMut`     | `mutate: useReducer(...)`     |
| blog profile   | `relax(useReducer(...))` + `mutate: upsertMut`     | `mutate: useReducer(...)`     |

---

## Inherent Platform Differences (NOT Gaps)

These are expected divergences due to SpacetimeDB vs Convex fundamentals:

| Feature       | lazyconvex (Convex)     | betterspace (SpacetimeDB)                |
| ------------- | ----------------------- | ---------------------------------------- |
| Schema source | Zod only (1x)           | t.ts + z.ts (2x minimum)                 |
| Data fetching | Query functions         | WebSocket subscriptions                  |
| IDs           | String                  | u32 auto-increment                       |
| Auth context  | `getAuthUserId(ctx)`    | `ctx.sender` (Identity)                  |
| File storage  | Built-in Convex storage | S3/R2 pre-signed URLs                    |
| Error type    | `ConvexError`           | `SenderError`                            |
| Return values | Mutations return values | Reducers don’t (await for success/error) |

---

## Phase 9: betterspace() Convenience Function

**Status**: [x] COMPLETE

The `betterspace()` function is a single-call replacement for the old `makeSchema()` +
`setupCrud()` + manual export assembly pattern.

**What changed for consumers**:

- Tagged table helpers (`ownedTable`, `orgScopedTable`, `childTable`, etc.)
  carry category metadata, so CRUD registration is inferred automatically.
  No separate `crud`, `orgCrud`, or `singletonCrud` config fields needed.
- `orgTable()` auto-creates `orgInvite`, `orgJoinRequest`, and `orgMember` tables.
  No manual org system table definitions.
- Options (`rateLimit`, `softDelete`, `cascade`, `ttl`) are inlined into each helper
  call instead of a separate config object.
- Consumer backend reduced from 45 lines (across 3 files) to 31 lines (1 file).
- The old `crud`, `options`, `org`, and `allExports` config fields are eliminated.

**Old pattern (3 files)**:

```ts
const { ownedTable } = makeSchema({ t, table })
const post = ownedTable(owned.post, { published: t.bool().index() })
const spacetimedb = schema({ post })
export default spacetimedb

const { crud, allExports } = setupCrud(spacetimedb, {
  idField: t.u32(),
  expectedUpdatedAtField: t.timestamp()
})
const postCrud = crud('post', owned.post)
export const reducers = spacetimedb.exportGroup(allExports())
```

**New pattern (1 file)**:

```ts
export default betterspace(({ ownedTable, t }) => ({
  post: ownedTable(owned.post, { published: t.bool().index() })
}))
```

---

## Summary

All 18 DX gaps are **CLOSED**. A developer moving from lazyconvex to betterspace writes
the same amount of code (or less) for equivalent functionality.

| Gap                                 | Before                              | After                      | Status |
| ----------------------------------- | ----------------------------------- | -------------------------- | ------ |
| 1. Field redefinition               | 3-4x                                | 2x (platform minimum)      | CLOSED |
| 2. Custom reducer factory           | Manual auth                         | `m()` in setupCrud         | CLOSED |
| 3. Per-table files                  | 387-line monolith                   | 2 files, 126 lines         | CLOSED |
| 4. Org cascade                      | 24+ lines callbacks                 | `cascadeTables: ['task']`  | CLOSED |
| 5. Org helper exports               | Missing 4 helpers                   | All exported               | CLOSED |
| 6. uniqueCheck helper               | Missing                             | `makeUnique` exported      | CLOSED |
| 7. makeOrg config                   | 50+ lines                           | 4 lines                    | CLOSED |
| 8. Export assembly                  | Manual spreads                      | `allExports()`             | CLOSED |
| 9. Schema verbosity                 | 205 lines (4.5x)                    | 31 lines, `betterspace()`  | CLOSED |
| 10. `key: undefined` boilerplate    | Every omitted field explicit        | Only changed fields        | CLOSED |
| 11. Schema variants boilerplate     | 44-line schema.ts + variants        | 24 lines, base schemas     | CLOSED |
| 12. Leftover `key: undefined`       | `assigneeId: undefined`             | Omit optional fields       | CLOSED |
| 13. `getName` boilerplate           | Static `getName` on every call      | Auto-inferred from reducer | CLOSED |
| 14. `null` not accepted             | `?? undefined` + `partialValues`    | Spread form data directly  | CLOSED |
| 15. Redundant `toastFieldError`     | Manual try/catch (double-toast)     | `useMutation` handles all  | CLOSED |
| 16. `useFormMutation` combined hook | Two hooks + manual `onSubmit`       | One hook, declarative      | CLOSED |
| 17. `useOrgMutation` auto-inject    | Manual `orgId: Number(org._id)`     | Auto-injected via config   | CLOSED |
| 18. `relax()` wrapper tax           | `relax()` + extra variable per form | Inline `useReducer(...)`   | CLOSED |

---

## Fresh-Eyes Audit (Post-Closure)

After closing all 18 gaps, a head-to-head comparison of every consumer file was
conducted. Gaps 16-17 reduced form boilerplate by combining `useMutation + useForm` into
`useFormMutation` and auto-injecting `orgId` via `useOrgMutation`. Gap 18 eliminated the
`relax()` wrapper tax on all `useFormMutation` calls by widening the `transform` return
type to `UndefinedToOptional<M>` inside the hook.

The remaining line count deltas are all **platform-inherent** or **betterspace
enhancements**:

| App   | betterspace | lazyconvex | Delta | Root Cause                                                                            |
| ----- | ----------- | ---------- | ----- | ------------------------------------------------------------------------------------- |
| org   | +150 lines  | —          | +150  | Client-side filtering (SpacetimeDB subscriptions vs Convex server queries)            |
| blog  | +70 lines   | —          | +70   | `useReducer` injection (platform), `useOptimisticMutation` pattern (platform)         |
| movie | +260 lines  | —          | +260  | Client-side TMDB fetch + Playwright mock data (no server-side actions in SpacetimeDB) |
| chat  | +8 lines    | —          | +8    | `useOnlineStatus` enhancement + Convex AI tool setup is longer                        |

**No new fixable DX gaps found.** Org delta dropped from +176 to +150 after Gaps 16-17
(useFormMutation + useOrgMutation), then further reduced after Gap 18 (no more `relax()`
import + wrapper per form page).
Blog delta similarly reduced after Gap 18. Remaining deltas are: `useReducer` hook
injection (platform — library can’t import SpacetimeDB SDK), client-side filtering
(platform — SpacetimeDB sends all data via WebSocket), and `useOptimisticMutation`
two-step pattern (platform — betterspace can’t wrap the SDK’s useReducer).

### What betterspace does BETTER than lazyconvex

- `useMutation` with `toast: { success, error }` — eliminates mutation+toast boilerplate
- `UndefinedToOptional` baked into `useFormMutation` + `useMutation` — zero boilerplate
  for optional fields
- `relax()` utility for non-form mutation calls (e.g. `useBulkMutate`)
- `useOnlineStatus` — presence detection not available in lazyconvex
- `AutoSaveIndicator` — built-in auto-save UI component
- `defineSteps` — typesafe multi-step form wizard
- `EditorsSection` — reusable per-item ACL editor component
