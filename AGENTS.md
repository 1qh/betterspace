I’m the author of betterspace, see README to learn more.
This repo contains the library itself and 4 real-world web app examples to showcase the
capabilities of betterspace.
I’ve spent significant effort raising DX to maximum so anyone who adopts betterspace
will have maximum typesafety for TypeScript, with every typo raising a type error as
expected.

# RULES

---

- only use `bun`, `yarn/npm/npx/pnpm` are forbidden
- `bun fix` must always pass
- `bun test:all` to run all tests in parallel, should pass every time we add new tests,
  new features, fix bugs or refactor code
- only use arrow functions
- all exports must be at end of file
- if a `.tsx` file only exports a single component, use `export default`
- `bun ts-unused-exports apps/<app-name>/tsconfig.json` to detect and remove unused
  exports
- `bun why <package>` to check if a package is already installed, no need to install
  packages that are already dependencies of other packages

## Pre-Push Verification (MANDATORY)

NEVER push before ALL of these pass locally:

```bash
bun fix
bun test:all
```

---

## Code Style

- consolidate into fewer files, co-locate small components
- short names in map callbacks: `t`, `m`, `i`
- `export default` for components, named exports for utilities/backend
- `catch (error)` is enforced by oxlint; name state variables descriptively to avoid
  shadow (e.g. `chatError`, `formError`)

### Component & Import Organization

- **co-location**: if a component is only used by 1 page, it lives next to that page
  (same folder)
- **shared components**: only move to `~/components` when reused across multiple pages
- **explicit imports**: always import from the exact file path, never from barrel
  `index.ts` files
- **no barrel exports**: do not create `index.ts` re-export files

---

## Linting

| Linter  | Ignore comment                                         |
| ------- | ------------------------------------------------------ |
| oxlint  | `// oxlint-disable(-next-line) rule-name`              |
| eslint  | `// eslint-disable(-next-line) rule-name`              |
| biomejs | `/** biome-ignore(-all) lint/category/rule: reason */` |

Run `bun fix` to auto-fix and verify all linters pass (zero errors, warnings allowed).

### Safe-to-ignore rules (only when cannot fix)

**oxlint:**

- `promise/prefer-await-to-then` - ky/fetch chaining

**eslint:**

- `no-await-in-loop`, `max-statements`, `complexity` - complex handlers
- `@typescript-eslint/no-unnecessary-condition` - type narrowing false positives
- `@typescript-eslint/promise-function-async` - functions returning thenable (not
  Promise)
- `@typescript-eslint/max-params` - utility functions with optional trailing params
- `@typescript-eslint/class-methods-use-this` - React lifecycle methods
  (componentDidCatch)
- `@next/next/no-img-element` - external images without optimization
- `react-hooks/refs` - custom ref patterns

**biomejs:**

- `style/noProcessEnv` - env validation files
- `performance/noAwaitInLoops` - sequential async operations
- `nursery/noForIn` - intentional control flow
- `performance/noImgElement` - external images
- `suspicious/noExplicitAny` - unavoidable generic boundaries

---

## Minimal DOM rule (React + Tailwind)

### Philosophy

Same UI, fewest DOM nodes.\** Every element must *earn its place If you can delete it
and nothing breaks (semantics, layout, behavior, required styling) → it shouldn’t exist.
Wrappers require justification in code review.

### When a node is allowed ("real reasons")

A DOM node is allowed only if it provides at least 1 of:

- Semantics / accessibility
  - Correct elements: `ul/li`, `button`, `label`, `form`, `fieldset/legend`, `nav`,
    `section`, etc.
  - Required relationships / focus behavior / ARIA patterns.

- Layout constraint you cannot apply to an existing node
  - Needs its own containing block / positioning context / clipping / scroll container /
    stacking context.
  - Examples: `relative`, `overflow-*`, `sticky`, `isolation`, `z-*`, `transform`,
    `contain-*`, `min-w-0` (truncation), etc.

- Behavior
  - Measurement refs, observers, portals target, event boundary, virtualization/scroll
    container.

- Component API necessity
  - You truly can’t pass props/classes to the real root (and you considered `as` /
    `asChild` / prop forwarding).

If none apply → **no wrapper**.

### Default moves (before adding wrappers)

Spacing / rhythm

- Between siblings → parent `gap-*` (flex/grid) or `space-x/y-*`.
- Prefer `gap-*` when you already use `flex`/`grid`

Separators

- Between siblings → parent `divide-y / divide-x` (instead of per-item borders).

Alignment

- Centering/alignment → put `flex/grid` on the existing parent that already owns the
  layout.

Visual ownership

- Padding/background/border/shadow/radius → put it on the element that visually owns the
  box.

JSX-only grouping

- Wrapper only to return multiple children → `<>...</>` (Fragment), not a `<div>`.

### Styling repeated children: pass props first, selectors second

#### Prefer passing `className` to the mapped item when

- The row is a component (`<Row />`) that can accept `className`.
- You need per-item variation (selected/disabled/first-last rules).
- You want clarity and low coupling (child internals can change).

```tsx
<div className="divide-y">
  {items.map(i => (
    <Row key={i.id} item={i} className="px-3 py-2" />
  ))}
</div>
```

#### Use selector pushdown when

- Children are simple elements you control (and styling is uniform).
- You want to avoid repeating the same classes on every item.
- You’re styling **direct children**, not deep internals.

```tsx
// bad
<div className='divide-y'>
  <p className='px-3 py-2'>Item 1</p>
  <p className='px-3 py-2'>Item 2</p>
  <p className='px-3 py-2'>Item 3</p>
  <button>click</button>
</div>
// good
<div className='divide-y [&>p]:px-3 [&>p]:py-2'>
  <p>Item 1</p>
  <p>Item 2</p>
  <p>Item 3</p>
  <button>click</button>
</div>
```

### Tailwind selector tools (for lists you own)

- `*:` applies to direct children: `*:min-w-0 *:shrink-0`
- Direct child targeting: `[&>li]:py-2 [&>li]:px-3`
- Broad descendant targeting (use sparingly): `[&_a]:underline [&_code]:font-mono`
- Stateful styling without wrappers:
  - `group` / `peer` on existing nodes (`group-hover:*`, `peer-focus:*`)
  - `data-[state=open]:*`, `aria-expanded:*`, `disabled:*`
- Structural variants to avoid wrapper logic: `first:* last:* odd:* even:* only:*`

### Examples

Spacing (column)

```tsx
// bad
<div><div className='mb-2'>A</div><div>B</div></div>
// good
<div className='space-y-2'><A /><B /></div>
```

Spacing (row)

```tsx
// bad
<div><div className='mr-3'>A</div><div>B</div></div>
// good
<div className='flex gap-3'><A /><B /></div>
```

Separators

```tsx
// bad
<div>{items.map(i => <div key={i.id} className='border-b'>{i.name}</div>)}</div>
// good
<div className='divide-y'>{items.map(i => <div key={i.id}>{i.name}</div>)}</div>
```

Pointless wrapper

```tsx
// bad
<div className='text-sm'><span>{name}</span></div>
// good
<span className='text-sm'>{name}</span>
```

Wrapper only for JSX

```tsx
// bad
<div><Label /><Input /></div>
// good
<><Label /><Input /></>
```

List semantics (wrapper is OK)

```tsx
<ul className="space-y-2">
  {items.map(i => (
    <li key={i.id}>{i.name}</li>
  ))}
</ul>
```

### Review checklist (strict)

- **Delete test:** can I remove this node without changing
  semantics/layout/behavior/required styling?
  → delete.
- **Parent control:** can `gap/space/divide` replace wrapper/margins/borders?
  → do it.
- **Props first:** can I pass `className` to the mapped item/component?
  → do it.
- **Selectors second:** can `[&>...]:` / `*:` remove repetition on direct children I
  control? → do it.
- **No hidden coupling:** avoid styling deep child internals unless it’s a deliberate
  API.

---

## E2E Testing Strategy (Playwright)

### Golden Rule: Verify Before Scaling

NEVER run full test suites blindly.
Always follow this progression:

#### 1. Isolate → Fix → Verify (Single Test)

```bash
# Run ONE failing test with short timeout
timeout 10 bun with-env playwright test -g "test name" --timeout=5000
# If it hangs, you have a bug. Don't proceed.
```

#### 2. Verify Fix Works (Same Single Test)

```bash
# Run it 2-3 times to confirm stability
timeout 10 bun with-env playwright test -g "test name" --timeout=5000
```

#### 3. Expand to Test File

```bash
# Only after single test passes reliably
timeout 30 bun with-env playwright test path/to/file.test.ts --timeout=8000
```

#### 4. Run Related Test Files

```bash
# Group related tests
timeout 60 bun with-env playwright test file1.test.ts file2.test.ts --timeout=8000
```

#### 5. Full Suite (ONLY WHEN USER ASKS)

**AI agents: Only run specific failing tests.** Fix them, verify they pass 2-3 times,
then stop. Run full suite ONLY when user explicitly requests it.

```bash
# Only run when user explicitly asks
bun test:e2e -- --workers=1 --timeout=10000 --reporter=dot
```

### Timeout Rules

| Scope             | Max Timeout  | Kill After |
| ----------------- | ------------ | ---------- |
| Single test debug | 5s           | 10s        |
| Single test file  | 8s per test  | 30s total  |
| Multiple files    | 8s per test  | 60s total  |
| Full suite        | 10s per test | 180s total |

### Early Failure Detection

Always use `timeout` command wrapper.
If a test hangs beyond expected time, KILL IT and investigate.

```bash
# GOOD: Early exit on hang
timeout 10 bun with-env playwright test -g "my test" --timeout=5000

# BAD: Wait forever
bun test:e2e  # Never do this without timeout wrapper
```

### Debug Hanging Tests

```bash
# Step 1: Check if page loads
timeout 8 bun with-env playwright test -g "test" --timeout=5000 --reporter=list

# Step 2: Add console output in test
test('debug', async ({ page }) => {
  console.log('Step 1')
  await page.goto('/path')
  console.log('Step 2')  // See where it hangs
})

# Step 3: Check element visibility
const el = page.getByTestId('x')
console.log('Visible:', await el.isVisible())
console.log('Enabled:', await el.isEnabled())
```

### Common Playwright Issues

| Symptom                                 | Likely Cause                 | Fix                                     |
| --------------------------------------- | ---------------------------- | --------------------------------------- |
| Test hangs on `fill()`                  | Input not visible/enabled    | Check element state first               |
| Test hangs on `click()`                 | Button disabled              | Check `isDisabled()`                    |
| `waitForLoadState('networkidle')` hangs | Continuous polling/websocket | Use `waitForSelector()` instead         |
| Element not found                       | Wrong locator                | Check if testid is on element vs parent |
| Flaky counts                            | Parallel test interference   | Run with `--workers=1`                  |

### Test Cleanup

```bash
# Always clean before running tests
pkill -9 -f "next" 2>/dev/null
rm -rf ./test-results ./playwright-report
```

### Pre-Test Checklist

Before running any E2E test:

1. [ ] `bun fix` passes (0 errors)
2. [ ] Dev server killed: `pkill -9 -f "next"`
3. [ ] Test results cleaned: `rm -rf test-results`

For individual tests (`bun with-env playwright test`), publish the SpacetimeDB module
first:

```bash
SPACETIMEDB_TEST_MODE=true bun spacetime:publish
```

`bun test:e2e` does this automatically before running tests.

---

## Next.js Dynamic Rendering with SpacetimeDB

SpacetimeDB data fetching happens client-side via WebSocket subscriptions.
Server Components that need to signal dynamic rendering should use `await connection()`
before any data access:

```tsx
import { connection } from 'next/server'

const Page = async () => {
  await connection() // signals dynamic rendering
  return <ClientComponent />
}
```

**Affected patterns:**

- Any Server Component that renders SpacetimeDB-subscribed client components
- Pages with user-specific data that must not be statically cached

---

## react-doctor

Run `bunx -y react-doctor@latest . --verbose` to scan all projects for React
best-practice violations.

### When to run

- After adding new components or pages
- After significant React refactors
- Before releases

### Known false positives (do NOT fix)

| Warning                                                               | Why it’s OK                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Unused file (Next.js pages/layouts/configs)                           | Framework entry points, not imported by user code                         |
| Unused export (cross-package library API)                             | Public API consumed by other packages — react-doctor scans per-project    |
| `<img>` for SpacetimeDB storage URLs                                  | Dynamic URLs from storage — `next/image` requires known `images.domains`  |
| `preventDefault()` on `<form>`                                        | SPA forms submitting via SpacetimeDB reducers, no server action           |
| `useEffect` with intersection observer `inView`                       | Standard infinite scroll pattern with `react-intersection-observer`       |
| `useSearchParams requires Suspense` when already wrapped at call site | react-doctor scans the component file, not where it’s rendered            |
| `dangerouslySetInnerHTML` / `<script>` in org-redirect                | Controlled redirect pattern for setting active org cookie                 |
| Missing metadata in demo app layouts/pages                            | Metadata is optional for demo apps — user preference to keep source clean |

### Rules to always follow

| Rule                                                       | Fix                                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Hook naming: functions calling hooks must start with `use` | Rename `withFoo` → `useFoo`                                                  |
| Array keys must use stable IDs, never indices              | Use `item.id`, `item.toolCallId`, etc.                                       |
| `useSearchParams()` needs `<Suspense>` boundary            | Wrap the component using it at the render site                               |
| No `Date.now()` / `Math.random()` during render            | Move impure calls into `useEffect` / `useState` initializer / event handlers |
| SpacetimeDB camelCase filenames need oxlint override       | Add to `.oxlintrc.json` `overrides` with `unicorn/filename-case: off`        |

---

## SpacetimeDB Module Type Safety

SpacetimeDB generates TypeScript bindings from the Rust module.
Always regenerate after schema changes:

```bash
bun spacetime:generate
```

**Where it bites**:

- Table names and reducer names must match the generated bindings exactly
- Column names are snake_case in Rust but camelCase in generated TypeScript
- Run `bun spacetime:generate` after any schema change, then check for TypeScript errors

**Defense**:

- Always import from `@a/be/spacetimedb` (the generated bindings), never from raw paths
- Rely on E2E tests and `bun spacetime:publish` to catch schema drift
- In test files, use the generated types directly

---

## Refactoring

After any significant refactoring, verify that passing a wrong field name to a reducer
call fails to compile.

---

# PROHIBITIONS

- NEVER write comments at all (lint ignores are allowed)
- NEVER touch files inside `packages/ui` (shared frontend components, read-only)
- NEVER use `Array#reduce()`, use `for` loops instead
- NEVER use `forEach()`, use `for` loops instead
- NEVER use non-null assertion operator (`!`)
- NEVER use `any` type
- NEVER hardcode project-specific data in `packages/betterspace/` — it is a
  general-purpose library for any developer

---

## Repository Architecture

`packages/betterspace/` is the **published library** (`bun add betterspace`). Everything
else is **consumer code** — demo apps that happen to live in the same monorepo:

| Path                    | Role                                         | Can reference betterspace internals? |
| ----------------------- | -------------------------------------------- | ------------------------------------ |
| `packages/betterspace/` | Library (npm published)                      | N/A — IS the library                 |
| `packages/be/`          | Demo backend (consumer) + SpacetimeDB module | NO — uses public API only            |
| `apps/`                 | Demo web apps (consumer)                     | NO — uses public API only            |
| `packages/ui/`          | Shared UI components (read-only)             | NO                                   |

**The library must work for ANY project, not just these demos.** A developer who runs
`bun add betterspace` and defines their own Zod schemas must get correct output without
editing library source.

---

## codegen: No Project-Specific Data

`codegen.ts` must derive ALL output from inputs it receives (schema file, spacetimedb
directory, CLI flags).
It must NEVER contain:

- Hardcoded function names, parameter lists, or return types for specific tables/modules
- Data structures that describe THIS project’s endpoints
- Anything that would require editing library source when a consumer adds a table,
  changes ACL, or writes custom reducers

### What codegen CAN know (from its own library code)

- Factory patterns: `crud()` always produces `list`, `read`, `create`, `update`, `rm`,
  `bulkCreate`, `bulkRm`, `bulkUpdate`
- `orgCrud()` with `acl: true` always produces `addEditor`, `removeEditor`,
  `setEditors`, `editors`
- `pub` option always produces `pub.list`, `pub.read` (or `pub.list`, `pub.get` for
  child)
- `softDelete` always produces `restore`
- `orgFns` always produces `create`, `update`, `get`, `getBySlug`, `myOrgs`, `remove`,
  `membership`, `members`, `setAdmin`, `removeMember`, `leave`, `transferOwnership`,
  `invite`, `acceptInvite`, `revokeInvite`, `pendingInvites`, `requestJoin`,
  `approveJoinRequest`, `rejectJoinRequest`, `pendingJoinRequests`
- `singletonCrud()` always produces `get`, `upsert`
- `cacheCrud()` always produces `get`, `all`, `list`, `create`, `update`, `rm`,
  `invalidate`, `purge`, `load`, `refresh`

### What codegen CANNOT know (must come from project-level config)

- Custom reducer signatures
- Custom return types for non-standard endpoints
- Custom subscription descriptors beyond standard patterns

### Test: is this generic?

If a developer runs
`bunx betterspace codegen --schema their-schema.ts --spacetimedb their-spacetimedb/` on
a project betterspace has never seen, does it produce correct output?
If not, something is hardcoded that shouldn’t be.

---

# SCALABILITY ARCHITECTURE

betterspace is built on SpacetimeDB — an in-memory real-time database.
Understanding its architecture is critical.
DO NOT think in Postgres/Convex mental models.
Think in SpacetimeDB’s native model.

## Core principle: SpacetimeDB is an MMO game server, not a REST API

BitCraft (an MMO) runs its ENTIRE backend — chat, items, terrain, millions of entities —
as a single SpacetimeDB database.
It handles tens of thousands of concurrent players.

A SaaS app with filtered subscriptions and bounded working sets is trivially simpler
than an MMO. If SpacetimeDB can handle BitCraft, it can handle your app.

## How data flows (subscriptions, not requests)

- Traditional DB: client requests page N → server queries → returns 20 rows → dead data
- SpacetimeDB: client subscribes to a bounded view → server pushes matching rows →
  updates stream in real-time → data is always live

There is no request-response cycle.
The server pushes data to the client continuously.
This is fundamentally different from REST/GraphQL/Convex.

## The chunk pattern (pagination without LIMIT/OFFSET)

SpacetimeDB subscriptions do NOT support LIMIT, OFFSET, or ORDER BY. This is intentional
— not a missing feature.

An MMO does not paginate entities.
Each player subscribes to their CHUNK (entities near them).
As they move, they subscribe to the new chunk and unsubscribe from the old one.

Apply the same pattern to any app:

| MMO concept      | App equivalent                                    |
| ---------------- | ------------------------------------------------- |
| Spatial chunk    | Time window (last 24h, last 7d)                   |
| Entities near me | Posts from my subreddits / tasks in my project    |
| Chunk loading    | Subscribe to next time window on scroll           |
| Chunk unloading  | Unsubscribe from old window to free client memory |

Consumer scrolls through content:

1. View subscribes to “recent posts from my communities, last 24h” → 200 posts
2. `useInfiniteList` paginates client-side (show 20, scroll for more)
3. User scrolls past 200 → subscribe to next window (1-7 days ago)
4. Old window unsubscribes → client memory stays bounded
5. Data older than 30 days → procedure fetch from cold storage (not real-time)

## Row-Level Security (RLS) via clientVisibilityFilter

Server-enforced, cannot be bypassed by clients.
Uses `:sender` (the connected client’s Identity, injected server-side).

betterspace auto-generates RLS from the `pub` option on each table:

| Consumer config    | Generated RLS filter                                       |
| ------------------ | ---------------------------------------------------------- |
| `pub: 'published'` | `WHERE published = true OR userId = :sender`               |
| `pub: true`        | No RLS (fully public)                                      |
| No pub (owned)     | `WHERE userId = :sender`                                   |
| No pub (orgScoped) | `JOIN orgMember ON orgId WHERE orgMember.userId = :sender` |

## Scaling model

A single SpacetimeDB instance on 512GB RAM handles:

- 100M registered users (1M concurrent at 1%)
- ~350GB of active data (30 days of content)
- 100K+ TPS write throughput
- Each client receives only ~200 rows (bounded by views + RLS)

You only need multi-instance sharding at genuine internet-giant scale (billions of
users). For startup-to-unicorn growth, a single instance suffices.

## Data lifecycle (keep tables bounded)

SpacetimeDB holds all data in RAM. Tables must stay bounded:

- TTL: scheduled reducers hard-delete data older than N days
- Archive: move cold data to external storage (S3/Postgres) before deletion
- Soft delete: mark as deleted, hard-delete after grace period

Hot data (last 30 days) stays in SpacetimeDB for real-time access.
Cold data (older) goes to external storage for historical queries.

## Anti-patterns (NEVER do these)

- NEVER subscribe to an entire large table without WHERE/view filtering
- NEVER think “I need LIMIT/OFFSET” — use bounded views instead
- NEVER store unbounded historical data without TTL — tables grow forever, RAM runs out
- NEVER use procedures/reducers for data the client needs in real-time — use
  subscriptions
- NEVER think in REST pagination mental model — think in subscription windows/chunks
- NEVER assume SpacetimeDB can’t scale — BitCraft (an MMO) proves it can.
  If your design doesn’t scale, your SCHEMA design is wrong, not the database

## When external services ARE needed

SpacetimeDB handles real-time community data.
These features need external services at scale:

- Full-text search across all content → Meilisearch / Typesense
- Cross-instance aggregation (global feeds, trending) → Redis + worker
- Analytics / reporting → ClickHouse / BigQuery
- Cold storage for archived data → S3 / Postgres

These are nice-to-haves at extreme scale, not requirements from day one.
Start with one instance, add external services only when you actually need them.
