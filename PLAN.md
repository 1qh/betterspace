# betterspace — Complete Port of lazyconvex to SpacetimeDB 2.0

## TL;DR

> **Quick Summary**: Build “betterspace” — an npm library that brings lazyconvex’s DX
> philosophy (thin consumer code, type-safe, great defaults) to SpacetimeDB 2.0. Same
> philosophy, **platform-native implementation** — the API embraces SpacetimeDB’s
> strengths (real-time subscriptions, SQL WHERE filtering, procedures with return
> values) rather than forcing Convex patterns onto it.
> 
> **Deliverables**:
> 
> - `betterspace` npm package with CRUD factories, hooks, components, middleware adapted
>   for SpacetimeDB
> - 4 web demo apps (blog, chat, movie, org) fully running on SpacetimeDB
> - All web tests reproduced and passing (1,362 tests: 923 library + 219 backend + 220
>   E2E)
> - Complete documentation rewritten for SpacetimeDB
> - ESLint plugin adapted for SpacetimeDB patterns (mappable rules only, ~8-10 of 16)
> - CLI adapted (remove codegen-swift, adapt remaining commands)
> 
> **Estimated Effort**: XL (multi-week) **Parallel Execution**: YES — 9 execution groups
> (Wave 0, Wave 1, Wave 2a, Wave 2b, Wave 3, Wave 4, Wave 5, Wave 6, Wave FINAL) +
> decision gates after spike **Critical Path**: Spike (22 validations) → Decision Gates
> (13) → Types/Schema → Server CRUD → setup.ts gate → React Hooks → Demo Apps → Tests →
> Final QA

* * *

## Context

### Motivation (Author’s Own Words)

I have been a big fan of Convex for a very long time, since the day it was started.
As I rely on Convex for most of my serious work and enterprise-grade systems, I had the
motivation to build lazyconvex — the best way to build any app using Convex with
wonderful DX and minimal consumer code, zero boilerplate.

However, today I have to make the hardest and biggest decision of my entire career.
All good things must come to an end.
SpacetimeDB just released their 2.0 version, and unexpectedly it’s so good that everyone
now ditches Convex and starts using it.
I’ve tested it myself and I have to say I’m super surprised that it does everything they
claimed. I know for now their features are not as plenty as Convex, but I came to Convex
mostly for the database, not other features they offer.
So I don’t really care about feature completeness or SDK support yet (I know SpacetimeDB
hasn’t supported Swift yet, that’s fine — TypeScript and React support is enough for
me). Moreover, SpacetimeDB even has built-in ORM-like `where`, `equal`, etc.
in client-side code, which is what I spent a lot of effort to have in lazyconvex.

That said, I’m gonna switch all my projects from Convex to SpacetimeDB, and I will
deprecate lazyconvex.
I know that’s sad, but I have to, even though I spent months and months building
lazyconvex. You don’t need to care about migration from Convex to SpacetimeDB — I’ll
handle this myself. Just look at SpacetimeDB with fresh eyes, with lazyconvex as
reference of how we can even extend the default setup to upgrade the DX even better.

I know the philosophy of “1 schema for everything” is no longer possible in SpacetimeDB,
since we will have to define a more specific type for each column, but for the
performance and better default DX, I accept that trade-off.
We now might need to have a customizable typesafe Zod schema inferred from each table
definition, just like how Drizzle has `table.$inferInsert` or `table.$inferSelect`.

My next move is to bring all the best things from lazyconvex to a new package called
“betterspace” (registered on npm).
“betterspace” would be an exact clone of lazyconvex (minus Swift demos and utilities)
that brings exceptional DX and shortened consumer code just like how lazyconvex offers
so far. We will embrace the same philosophy: **Thin consumer code, no-brainer backend,
great defaults, maximum typesafety.** We can also try to eliminate Convex’s limitations
(like we don’t have COUNT, or WHERE is just filter in memory runtime...).

The approach: clone lazyconvex to betterspace, remove all Swift-related code, reinit a
new repo, then incrementally build each part for betterspace with SpacetimeDB while
still keeping Convex code as reference.
After each phase of build, always make sure all tests and checks pass (skip
Convex-related checks and tests).
The final goal is **all apps running, all tests reproduced, no tests fail, complete
documentation.** *(Note: While the original intent was “1:1 port”, the strategic
overhaul reframed this as “same DX philosophy, platform-native implementation” — the API
embraces SpacetimeDB’s model rather than forcing Convex patterns.)*

### Original Request (Summary)

Deprecate lazyconvex.
Port ALL functionality to “betterspace” backed by SpacetimeDB 2.0. Clone repo, remove
Swift, reinit, incrementally replace Convex with SpacetimeDB while keeping Convex code
as reference.

### Interview Summary

**Key Discussions**:
- File storage: SpacetimeDB has no built-in storage → use procedures + R2/S3 for file
  uploads
- Auth: SpacetimeAuth (official OAuth integration) replaces Convex Auth
- Testing: Local SpacetimeDB instance (`spacetime start`, publish module, test against
  real DB)
- Deployment: Support both Maincloud and self-hosted
- Philosophy preserved: “Thin consumer code, no-brainer backend, great defaults, maximum
  typesafety”

**Strategic Update (Post-Research)**: After deep research into SpacetimeDB’s actual
capabilities (official docs, SQL reference, procedures, subscriptions, SpacetimeAuth),
the plan has been reframed:
- **NOT a “1:1 port”** — same DX philosophy, platform-native implementation
- **Auth**: Google OAuth via SpacetimeAuth (SpacetimeAuth has NO email/password — only
  magic link + OAuth providers)
- **CRUD return values**: Procedures return values to client (Promise-based).
  Reducers do NOT. Strategy: **spike-determined** — Spike Item 1 validates whether
  procedures with `withTx` reliably return auto-increment IDs.
  If YES: procedures for creates (return IDs), reducers for updates/deletes.
  If procedures have issues (latency, reliability, WASM constraints): reducers for ALL
  mutations, with subscription-based ID discovery for creates.
- **Pagination**: Smart subscription + client-side slicing.
  Subscription SQL has NO LIMIT/OFFSET/ORDER BY. SQL WHERE filters server-side,
  sort/paginate client-side from local cache.
- **Optimistic updates**: No built-in support (GitHub issue #2453). Custom client-side
  layer needed — but may be unnecessary if reducer latency is <100ms (spike will
  measure).
- **File storage**: Pre-signed URL pattern via procedures.
  Procedures CAN make HTTP requests (ctx.http.fetch, 500ms timeout).
  Single-file upload only in v1 — chunked upload deferred.
- **API divergence**: betterspace API names and patterns may differ from lazyconvex
  where SpacetimeDB’s model is fundamentally different (e.g., subscription-based data
  fetching vs query functions, client-side pagination vs server cursors).

**Native API Concept Mapping**:

| Concept | lazyconvex (Convex) | betterspace (SpacetimeDB) | Rationale |
| --- | --- | --- | --- |
| Data access | Query functions + mutations | Subscriptions + reducers/procedures | Platform-native |
| Pagination | Server-side cursor (`usePaginatedQuery`) | Client-side slicing from subscription cache | No LIMIT/OFFSET in subscription SQL |
| IDs | String `Id<'table'>` | `u64` auto-increment | Platform-native |
| Auth check | `getAuthUserId(ctx)` | `ctx.sender` Identity | Platform-native |
| Return values | Mutations return values | Procedures return, reducers don’t | Platform constraint |
| Reactivity model | Per-query subscriptions | Per-table subscriptions with SQL WHERE | Fundamentally different |
| File storage | Built-in Convex storage | Pre-signed URL via R2/S3 + procedures | No built-in file storage |
| Auth | @convex-dev/auth (email/password/OAuth) | SpacetimeAuth (magic link/OAuth only) | Google OAuth for demo apps |
| Presence | Custom heartbeat + reactive queries | Table + connect/disconnect lifecycle | SpacetimeDB has lifecycle events |
| Input validation | Zod validators at network boundary | SpacetimeDB type system (t.* types validate automatically) | Platform-native |

**Research Findings (verified from official docs)**:
- SpacetimeDB tables use `t.*` types, reducers are ACID with no return values, views are
  read-only computed queries
- **Procedures (new in 2.0, API is BETA — “API may change in upcoming releases”)**: CAN
  return values to client, CAN make HTTP requests, NOT automatically ACID (must use
  ctx.withTx()), can’t do HTTP + transaction simultaneously.
  **Risk**: Pin SDK version at spike time and hold for entire project.
  Monitor SpacetimeDB changelog for breaking changes.
- **`ctx.http.fetch()` is SYNCHRONOUS**: In procedures, HTTP fetch blocks until response
  (no await, no Promise on server side).
  Client receives the procedure’s return value via Promise.
  This means procedure execution time = HTTP latency.
  The 500ms timeout applies to the entire procedure, including HTTP time.
- **Two-phase pattern for HTTP+DB**: Procedures CANNOT do HTTP fetch inside
  `ctx.withTx()`. Must: (1) `ctx.http.fetch()` first (outside transaction), (2)
  `ctx.withTx(txCtx => { txCtx.db.{table}.insert(...) })` second.
  This is a hard constraint — violating it causes runtime error.
- **`t.u32()` vs `t.u64()` for auto-inc IDs**: `t.u64()` → `bigint` (NOT
  JSON-serializable, breaks `JSON.stringify`, needs coercion for URL params/forms).
  `t.u32()` → `number` (max ~4.2 billion, JSON-safe, URL-safe, form-safe).
  **Recommendation**: Use `t.u32()` for auto-increment IDs unless >4.2B rows expected —
  avoids bigint serialization pain entirely.
  Spike Item 18 validates both.
- **Reducer `await` pattern (SpacetimeDB 2.0)**: Reducers CAN be `await`ed —
  `await ctx.reducers.create_blog(...)` resolves on success, rejects with `SenderError`
  on failure. Reducers do NOT return custom values (only success/error), but you DO get
  confirmation that the mutation completed.
  This means: (1) form submission can `await` the reducer and show success/error without
  polling, (2) optimistic updates know when the reducer SUCCEEDED (for rollback on
  failure), (3) error handling is cleaner than “fire-and-forget.”
  Procedures are still needed for return values (like auto-inc IDs).
  Use
  `try { await conn.reducers.create(...) } catch (err) { if (err instanceof SenderError) handleError(err) }`.
- **Global reducer callbacks REMOVED in 2.0**: Replaced by event tables and per-call
  `_then()` callbacks.
  This affects real-time notification patterns — use event tables or per-call callbacks
  instead.
- **Identity class (NOT a string)**: `ctx.sender` returns an `Identity` class with
  `.toHexString()` and `.isEqual()`. NOT directly comparable with `===`. Needs utility
  functions: `identityToHex(id)`, `identityFromHex(hex)`, `identityEquals(a, b)`. Cannot
  be used as React key directly — must convert to hex string first.
  Cannot be stored in localStorage directly — must serialize to hex string.
- Client SDK: `useTable('name', where(eq('field', val)))` with real DB filtering
- **Subscription SQL**: `SELECT * FROM table [WHERE predicate]` ONLY. No LIMIT, OFFSET,
  ORDER BY, COUNT, column projections.
  Max 2-table JOINs.
- **Query SQL** (via CLI/HTTP/PGWire): Supports LIMIT, COUNT. No OFFSET, ORDER BY.
- **PGWire**: PostgreSQL wire protocol for admin queries.
  Same SQL engine underneath, does NOT add PostgreSQL features.
- Generated bindings from `spacetime generate` replace Convex’s `api.*` proxy
- Bulk operations work by accepting arrays in a single reducer (one ACID transaction)
- Presence: table-based with connect/disconnect lifecycle events (simpler than Convex
  approach)
- **SpacetimeAuth**: Magic link, GitHub, Google, Discord, Twitch, Kick OAuth.
  NO email/password. OIDC standard.
  Role-based access control.
- **Infrastructure/Deployment**:
  - **Docker**: Official image `clockworklabs/spacetime:latest` (Docker Hub, 10K+ pulls,
    actively maintained).
    SpacetimeDB’s own repo uses it in production benchmarks.
    Usage: `docker run --rm --pull always -p 3000:3000 clockworklabs/spacetime start`.
    For persistent data: mount a volume to `/data`.
  - **Docker Compose** (from SpacetimeDB’s own keynote template):
    ```yaml
    spacetime:
      image: clockworklabs/spacetime:latest
      command: start
      ports:
        - "3000:3000"
      volumes:
        - spacetime_data:/data
    ```
  - **Maincloud**: Managed hosting at `spacetimedb.com` —
    `spacetime publish --server maincloud`
  - **Self-hosted (manual)**: Ubuntu + systemd + Nginx + Let’s Encrypt (documented at
    `spacetimedb.com/docs/how-to/deploy/self-hosting/`)
  - **Self-hosted (Docker)**: Docker + Nginx reverse proxy — simpler than manual, but
    NOT in official self-hosting docs yet (only on install page).
    Docker IS the recommended approach for betterspace.
  - **Local dev**: Docker is simplest: `docker compose up` spins up SpacetimeDB locally
    on port 3000. Alternative: `spacetime start` (requires CLI installed).

### Metis Review

**Identified Gaps** (addressed):
- **Corrected feature inventory**: 14+ hooks (not just the few discussed), middleware
  system, presence system
- **Full-text search gap**: SpacetimeDB has no full-text search → client-side filtering
  over subscriptions for demo scale; documented as known limitation with future
  extensibility via external service
- **Bulk operations pattern**: Single reducer accepting arrays, iterating in one
  transaction
- **cacheCrud relevance**: SpacetimeDB’s subscription model client-caches all data →
  cacheCrud may become a thin wrapper or be simplified.
  Spike will validate.
- **Organization subsystem**: 3 separate files (invites, joins, members) — substantial
  port (~1,000+ lines)
- **CLI correction**: 6 commands, not 8 (init, check, migrate, viz, codegen-swift, docs)
- **Middleware composition**: Must preserve `composeMiddleware` pattern adapted to
  reducer wrappers
- **Scope creep lock-downs**: No new features, no presence enhancements, no middleware
  additions

* * *

## Work Objectives

### Core Objective

Build “betterspace” — an npm library that brings lazyconvex’s DX philosophy to
SpacetimeDB 2.0. Same philosophy (thin consumer code, no-brainer backend, great
defaults, maximum typesafety), **platform-native implementation** (API embraces
SpacetimeDB’s model rather than forcing Convex patterns).
All 4 web demo apps running on SpacetimeDB with all tests reproduced.

### Concrete Deliverables

- `packages/betterspace/` — Published library with all factories, hooks, components,
  middleware, ESLint rules, CLI
- `packages/be/` — Backend consumer rewritten as SpacetimeDB TypeScript modules
- `apps/blog/` — Blog demo app running on SpacetimeDB
- `apps/chat/` — Chat demo app running on SpacetimeDB (with presence)
- `apps/movie/` — Movie demo app running on SpacetimeDB (with cache/external API)
- `apps/org/` — Org demo app running on SpacetimeDB (with multi-tenant ACL)
- All tests reproduced and passing

### Definition of Done

- [ ] `bun fix` passes with zero errors
- [ ] `bun test:all` passes (all library + backend + E2E tests)
- [ ] All 4 web apps start and render correctly against local Docker SpacetimeDB
- [ ] No Convex runtime dependencies remain (Convex code kept as reference only, not
  imported)
- [ ] Package publishable to npm as “betterspace”
- [ ] All tests pass identically on Maincloud — zero regressions vs Docker (tested after
  user provides credentials)

### Abort Criteria (MANDATORY — when to stop and consult user)

- If Gates 3 (Identity stability), 6 (Test auth bypass), AND 12 (Read-side ACL) **ALL**
  fail with no viable fallback → PAUSE project and consult user before Wave 1. These
  three together mean: ownership doesn’t work, tests can’t run, and reads aren’t secure
  — the core value proposition is broken.
- If more than 3 of the 13 gates fail with no fallback → PAUSE and reassess scope.
  Too many fundamental gaps means the platform isn’t ready.
- If Spike Item 19 (monorepo build chain) fails AND no pre-build workaround works →
  PAUSE. Can’t build = can’t ship.
- Note: Individual gate failures with documented fallbacks are EXPECTED and acceptable.
  The abort threshold is multiple CRITICAL failures with NO viable fallback.

### Must Have

- Same DX philosophy as lazyconvex, adapted to SpacetimeDB’s native patterns
- All 5 CRUD factory patterns adapted (crud, orgCrud, childCrud, cacheCrud — but
  cacheCrud may be simplified if SpacetimeDB subscriptions provide sufficient caching;
  singletonCrud)
- All 14+ React hooks adapted (some will have different internals due to subscription
  model)
- Branded type system with compile-time enforcement (using SpacetimeDB’s `t.*` types,
  IDs are `u64` not string)
- Organization system with invites, joins, members, ACL (port LAST in Wave 2; can be
  deferred if 2x estimated effort)
- Middleware system concept preserved (auditLog, slowQueryWarn, inputSanitize,
  composeMiddleware — adapted to reducer/procedure wrappers)
- Real-time presence system (table-based with connect/disconnect lifecycle)
- Single-file upload system (via procedures + R2/S3 pre-signed URLs)
- ESLint plugin with mappable rules only (~8-10 of 16 — rules without SpacetimeDB
  equivalent are dropped)
- CLI commands adapted (remove codegen-swift, port applicable commands)
- `setup()` main entry point composing all factories (server/setup.ts — 327 lines)
- Organization management factory (server/org.ts — 304 lines, separate from orgCrud)
- `packages/fe/` ported to SpacetimeDB (10 Convex-specific files: provider, auth pages,
  user menu, env, CSP config, error boundary, image route, utils)
- `packages/e2e/` ported to SpacetimeDB (9 Convex-specific files: global-setup/teardown,
  playwright config, org helpers)
- `packages/ui/` preserved as-is (read-only, no Convex deps), `tooling/` preserved
- All code style rules from AGENTS.md preserved (no comments, arrow functions, no
  reduce/forEach/any, bun only)
- SpacetimeDB SDK version pinned in spike and held for entire port

### API Divergence Boundaries (Stable vs May Change)

> Explicitly declaring which consumer-facing behaviors MUST remain identical to
> lazyconvex and which MAY change due to SpacetimeDB’s different model.
> This prevents late-stage churn when tests/docs need rewriting because semantics
> shifted unexpectedly.

**STABLE — These behaviors MUST match lazyconvex (tests verify them):**
- `setup()` call pattern: same shape, same return type structure, same factory
  composition
- Factory option names: `softDelete`, `timestamps`, `ownership`, `pub`, `acl` — same
  options, same behavior
- Hook return shapes: `useList` returns `{ data, isLoading, error }` pattern (names may
  differ slightly)
- Form integration: Zod schemas validate input, form components accept same props
- Middleware composition: `composeMiddleware(...)` accepts same middleware array pattern
- ESLint rule names: same rule identifiers where mappable
- CLI command names: same commands where applicable

**MAY CHANGE — These behaviors will differ from lazyconvex (documented in migration
guide):**
- `StrictApi` type export: REMOVED — Convex uses `anyApi` proxy with
  `StrictApi<FullApi>` wrapper for type safety.
  SpacetimeDB uses generated bindings instead (from `spacetime generate`), which are
  inherently type-safe.
  Consumer code changes from `api.blog.list` to generated binding imports.
- `create()` return value: may return ID via Promise (procedure) or require reading from
  subscription (reducer) — determined by Gate decision from Spike Item 1
- ID type: `u64` (bigint) instead of `string` — all comparisons, URL params, form values
  affected
- Pagination: client-side slicing instead of server cursor — `useInfiniteList` may have
  different semantics
- Data fetching model: subscriptions (always-on) instead of queries (on-demand) —
  `useList` is reactive by default
- Auth: `ctx.sender` (Identity) instead of `getAuthUserId(ctx)` (string) — identity
  comparison may require utility
- File upload URLs: R2/S3 pre-signed URLs instead of Convex storage — different URL
  format
- Error types: `SenderError(string)` instead of `ConvexError({ code, message })` — error
  handling pattern changes
- SSR: may not support server-side data fetching — determined by Gate 7
- Presence: implementation mechanism differs (lifecycle/TTL/heartbeat) — determined by
  Gate 11

### Leverage SpacetimeDB Built-ins (CRITICAL — Avoid Overwork)

> **BEFORE implementing ANY feature, check whether SpacetimeDB already provides it out
> of the box.** If SpacetimeDB has a native solution — even if it differs from
> lazyconvex’s approach — USE IT. Only build custom layers where SpacetimeDB genuinely
> has no equivalent.
> 
> This principle applies to EVERY task.
> The executing agent MUST research SpacetimeDB’s current capabilities before writing
> custom code. Examples of what SpacetimeDB may already provide:
> 
> - **Client-side caching**: SpacetimeDB subscriptions auto-cache locally — do we need
>   cacheCrud at all?
> - **Real-time updates**: Subscriptions with `onInsert`/`onUpdate`/`onDelete` — do we
>   need custom optimistic layers?
> - **WHERE filtering**: `useTable('table', where(eq('field', val)))` — do we need
>   custom filter utilities?
> - **Type validation**: `t.*` type builders validate at the DB boundary — do we need
>   Zod on the server?
> - **Reconnection**: SDK may handle WebSocket reconnection natively — do we need retry
>   logic?
> - **Identity management**: SpacetimeAuth may handle session persistence — do we need
>   custom session code?
> - **Bulk operations**: Single reducer with array iteration is ACID — do we need
>   special bulk helpers?
> 
> **Decision framework per feature**:
> 
> 1. Does SpacetimeDB have this natively?
>    → **USE IT, don’t reimplement**
> 2. Does SpacetimeDB have a partial solution?
>    → **Extend it, don’t replace it**
> 3. Does SpacetimeDB have nothing?
>    → **Build it, but keep it minimal**
> 
> The spike (Task 2) is the primary discovery phase for built-in capabilities.
> Each spike item should document: “SpacetimeDB provides X natively — no custom code
> needed” or “SpacetimeDB does NOT provide X — custom implementation required, here’s
> the minimal approach.”

### Must NOT Have (Guardrails)

- NO reimplementing SpacetimeDB built-in features — if SpacetimeDB provides it natively,
  use it (see “Leverage SpacetimeDB Built-ins” above)
- NO Swift/mobile/desktop code — all removed in Phase 0
- NO new features beyond what lazyconvex has — this is a port, not an enhancement
- NO Convex runtime dependencies in final build — kept as reference files only
- NO `npm/yarn/npx/pnpm` usage — `bun` only
- NO comments in code (lint ignores allowed)
- NO `Array#reduce()`, `forEach()`, non-null assertions, `any` type
- NO hardcoded project-specific data in library package
- NO presence enhancements (no cursor tracking, typing indicators beyond what exists)
- NO middleware additions beyond the 3 existing ones
- NO org feature expansion (no billing, quotas, etc.)
- NO external search service integration yet — client-side filtering only for now
- NO Convex types in betterspace’s public API — no `import from 'convex/*'` in
  `packages/betterspace/src/`
- NO chunked file upload in v1 — single-file upload only (chunked deferred to v2)
- NO 1:1 copy of test utilities (test.ts, 859 lines) — build test helpers from scratch
  based on SpacetimeDB’s testing model (real local DB, not mocks)
- NO forcing Convex-shaped API onto SpacetimeDB — where the platform is fundamentally
  different, the API diverges
- NO ESLint rules without SpacetimeDB equivalent — drop unmappable rules instead of
  inventing new ones
- NO full-table subscriptions except for tiny tables (<100 rows) — ALL subscriptions
  MUST use WHERE filters to bound client cache size.
  Full-table subscriptions load ALL rows into client memory (unlike Convex’s paginated
  queries). Enforce this convention in CRUD factory and hooks.
- NO devtools panel or schema playground as blocking tasks — stub for compilation,
  polish in Wave 6

* * *

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.
> No exceptions.

### Test Decision

- **Infrastructure exists**: YES (bun test, Playwright)
- **Automated tests**: YES (tests-after — reproduce existing tests with SpacetimeDB
  equivalents)
- **Framework**: bun test for unit/integration, Playwright for E2E
- **Approach**: Port each test file to use SpacetimeDB instead of Convex.
  Tests run against local SpacetimeDB instance.

### QA Policy

Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM,
  screenshot
- **Server modules**: Use Bash — `spacetime publish`, `spacetime call`, `spacetime sql`,
  assert output
- **Library code**: Use Bash (bun test) — Run specific test files, assert pass
- **Integration**: Use Bash — Start local SpacetimeDB, publish module, run app, verify
  with Playwright

* * *

## Execution Strategy

### Parallel Execution Waves

```
Wave 0 (Foundation — SEQUENTIAL, must complete first):
├── Task 1: Clone repo, remove Swift, reinit as betterspace [quick]
├── Task 2: Comprehensive Spike — 22 validation items with go/no-go criteria [deep + playwright]
├── Decision Gates 1-11: Binary decisions that may add tasks or remove scope
└── (ALL subsequent work blocked until spike + gates complete)

Wave 1 (Schema & Types + Provider/Auth — after spike validates patterns):
├── Task 3: Port branded type system to SpacetimeDB t.* types [deep]
├── Task 4: Create Zod ↔ SpacetimeDB t.* bridge for client forms [deep]
├── Task 5: Port ALL helpers/utilities (11 files, ~1,344 lines) [unspecified-high]
├── Task 6: Set up SpacetimeDB dev infrastructure (local instance, scripts) [quick]
└── Task 23b: Port packages/fe/ shared frontend (10 Convex-specific files) [unspecified-high] ← PULLED FORWARD (provider/auth/CSP are early blockers)

Wave 2a (Server CRUD Factories — core of the library, ALL PARALLEL):
├── Task 7: Port crud() factory to SpacetimeDB reducers + views [deep]
├── Task 8: Port orgCrud() factory with ACL [deep]
├── Task 9: Port childCrud() factory (parent-child relationships) [deep]
├── Task 10: Port singletonCrud() factory [quick]
├── Task 11: Port cacheCrud() factory (adapt to subscription model) [deep]
├── Task 12: Port middleware system (auditLog, slowQueryWarn, inputSanitize, composeMiddleware) [unspecified-high]
├── Task 13: Port file upload system (procedures + R2/S3) [unspecified-high]
├── Task 13c: Port org.ts — org management factory (create/delete/cascade) [deep]
└── Task 13d: Port test infrastructure (test.ts 859 lines + test-discover.ts) [unspecified-high]

Wave 2-SKELETON (Walking Skeleton Milestone — AFTER Task 7 + Task 23b complete, BEFORE scaling to remaining factories):
└── Walking Skeleton Gate: FULL integration test including provider/auth path from Task 23b.
    Steps to validate:
    1. `SpacetimeDBProvider` from 23b wraps a Next.js page (CSP headers allow WebSocket to SpacetimeDB)
    2. User authenticates via SpacetimeAuth Google OAuth (real OAuth flow, not mock)
    3. Authenticated user calls crud()-generated create reducer → row inserted with `owner: ctx.sender`
    4. Subscription fires → new row appears in React UI via `useTable`
    5. Second user (different Identity) tries to update the row → ownership check rejects
    6. Verify: WebSocket connection, CSP headers, auth token passing, subscription deltas, ownership enforcement
    7. **Exercise Gate 12 outcome**: Subscribe to data using the INTENDED secure read mechanism (view-based, procedure-based, or documented-trust depending on gate decision). Do NOT use direct table subscriptions if Gate 12 determined they are unsafe for multi-tenant data.
    This is a MANDATORY integration checkpoint. If the walking skeleton fails, it reveals SpacetimeDB integration issues BEFORE investing in 8 more factories + 14 hooks.
    Pass: End-to-end data flow works WITH auth (publish → connect → authenticate → subscribe → mutate → see update → ownership enforced)
    Fail: STOP. Fix integration issues before proceeding. Common failures: CSP blocks WebSocket, auth token not passed to SpacetimeDB, subscription doesn't fire, provider crashes, Identity mismatch between auth and ctx.sender.

Wave 2b (Sequential gate — AFTER all Wave 2a factories complete):
└── Task 13b: Port setup.ts — main entry point composing all factories [deep] (depends on Tasks 7-13, 13c)

Wave 3 (React Layer — hooks + components):
├── Task 14: Port useList hook (client-side pagination over subscriptions) [deep]
├── Task 15: Port useInfiniteList hook [deep]
├── Task 16: Port useSearch hook (client-side filtering) [unspecified-high]
├── Task 17: Port useForm + useFormMutation hooks [deep]
├── Task 18: Port useSoftDelete, useBulkSelection, useOptimistic + 6 supporting files [unspecified-high] ← EXPANDED
├── Task 19: Port useUpload hook (R2/S3 integration) [unspecified-high]
├── Task 20: Port usePresence hook + makePresence [deep]
├── Task 21: Port Form + defineSteps + fields.tsx (937 lines) + file-field.tsx [visual-engineering] ← EXPANDED
├── Task 22: Port components + devtools + schema-playground + next/image.ts [visual-engineering] ← EXPANDED
└── Task 23: Port org hooks (useOrg, useMyOrgs) + org components [unspecified-high]

Wave 4 (Backend + Demo Apps):
├── Task 24: Port backend consumer (packages/be/) to SpacetimeDB modules [deep]
├── Task 25: Port blog demo app [unspecified-high]
├── Task 26: Port chat demo app (with presence) [unspecified-high]
├── Task 27: Port movie demo app (with external API via procedures) [unspecified-high]
└── Task 28: Port org demo app (with multi-tenant ACL) [deep]

Wave 5 (Tooling + Tests):
├── Task 29: Port ESLint plugin (adapt 16 rules for SpacetimeDB patterns) [deep]
├── Task 30: Port CLI commands (remove codegen-swift, adapt remaining) [deep]
├── Tasks 31a-d: Port library unit tests (923 tests split into 4 parallel subtasks of ~230 each) [4x deep]
├── Task 32: Port backend tests (219 tests) [deep]
├── Task 33b: Port packages/e2e/ shared E2E infrastructure (9 files) [unspecified-high] ← NEW
└── Task 33: Port E2E Playwright tests (220 tests) [deep] (depends on 33b)

Wave 6 (Documentation + Polish):
├── Task 34: Rewrite all documentation for SpacetimeDB [writing]
├── Task 35: Update package.json, README, AGENTS.md for betterspace [writing]
└── Task 36: Final cleanup — remove Convex reference code, verify clean build [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high + playwright)
└── Task F4: Scope fidelity check (deep)

Wave MAINCLOUD (After FINAL — requires user credentials, BLOCKED until provided):
├── Task M1: Deploy to Maincloud + run full test suite (deep + playwright)
└── Task M2: Maincloud vs Docker comparison report (writing)

Critical Path: T1 → T2 (22 items) → Decision Gates (13) → T3 → T7 → T13b → T24 → T14 → T25-28 → T31a-d → T32-33 → F1-F4 → M1-M2
Parallel Speedup: ~40-50% faster than sequential (conservative — see coordination hotspots below)
Max Concurrent: 9 (Wave 2a)
Note: Decision Gates may add tasks (Task 2b React binding, Task 7b multi-table join, Task 3b serialization, Task 11b API proxy, Task 13e test auth) which extend the critical path

**Coordination Hotspots** (limit true parallelism):
- `server/types.ts`: Edited by Tasks 3, 7-13 — each factory may add types. Must establish type structure in Task 3, then factories ADD to it without conflicts.
- `setup.ts` (Task 13b): Sequential gate — compiles ALL factories. Cannot start until Wave 2a completes.
- `spacetime generate` bindings: Regenerated when module schema changes. Tasks that add tables/reducers must coordinate — run `spacetime generate` after each factory, not at the end.
- Provider/auth (Task 23b): Shared by all demo apps. Pulled to Wave 1 to surface CSP/WebSocket/auth issues early.
- Walking Skeleton: Mandatory checkpoint after Task 7 — validates end-to-end integration before scaling.
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
| --- | --- | --- | --- |
| 1 | — | 2-36 | 0 |
| 2 | 1 | Decision Gates → 3-36 | 0 |
| 3 | 2 | 7-13 | 1 |
| 4 | 2 | 17, 21 | 1 |
| 5 | 2 | 7-13 | 1 |
| 6 | 2 | 7-13, 24-28 | 1 |
| 7 | 3, 5 | 13b, 14-20, 24 | 2a |
| 8 | 3, 5 | 13b, 23, 28 | 2a |
| 9 | 3, 5 | 13b, 24, 26 | 2a |
| 10 | 3, 5 | 13b, 24 | 2a |
| 11 | 3, 5 | 13b, 24, 27 | 2a |
| 12 | 3, 5 | 13b, 24 | 2a |
| 13 | 5, 6 | 19, 25 | 2a |
| 13b | 7-13, 13c | 24, 25-28 | 2b |
| 13c | 3, 5 | 13b, 23, 28 | 2a |
| 13d | 3, 5, 6 | 31-33, 33b | 2a |
| 14 | 7 | 25-28 | 3 |
| 15 | 7 | 25-28 | 3 |
| 16 | 7 | 25-28 | 3 |
| 17 | 4, 7 | 25-28 | 3 |
| 18 | 7 | 25-28 | 3 |
| 19 | 7, 13 | 25 | 3 |
| 20 | 7 | 26 | 3 |
| 21 | 4, 7 | 25-28 | 3 |
| 22 | 7 | 25-28 | 3 |
| 23 | 8 | 28 | 3 |
| 23b | 2 (gates) | 25-28 | 1 (pulled forward — provider/auth/CSP are early blockers) |
| 24 | 6-12, 13b | 25-28 | 4 |
| 25 | 14-19, 21, 23b, 24 | 33 | 4 |
| 26 | 14-16, 20, 23b, 24 | 33 | 4 |
| 27 | 11, 14-16, 23b, 24 | 33 | 4 |
| 28 | 8, 14-16, 23, 23b, 24 | 33 | 4 |
| 29 | 3 | 36 | 5 |
| 30 | 6 | 36 | 5 |
| 31 | 7-13, 13d | F1-F4 | 5 |
| 32 | 24, 13d | F1-F4 | 5 |
| 33b | 6, 13d, 24 | 33 | 5 |
| 33 | 25-28, 33b | F1-F4 | 5 |
| 34 | 7-13, 14-23 | 36 | 6 |
| 35 | all | 36 | 6 |
| 36 | 29-35 | F1-F4 | 6 |
| F1 | 36 | M1 | FINAL |
| F2 | 36 | M1 | FINAL |
| F3 | 36 | M1 | FINAL |
| F4 | 36 | M1 | FINAL |
| M1 | F1-F4, user creds | M2 | MAINCLOUD |
| M2 | M1 | — | MAINCLOUD |

### Agent Dispatch Summary

| Wave | Tasks | Agents |
| --- | --- | --- |
| 0 | 2 | T1 → `quick`, T2 → `deep` + `playwright` skill (22 validation items + 13 decision gates) |
| 1 | 5 | T3 → `deep`, T4 → `deep`, T5 → `unspecified-high`, T6 → `quick`, T23b → `unspecified-high` (pulled forward — provider/auth/CSP) |
| 2a | 9 | T7 → `deep`, T8 → `deep`, T9 → `deep`, T10 → `quick`, T11 → `deep`, T12 → `unspecified-high`, T13 → `unspecified-high`, T13c → `deep`, T13d → `unspecified-high` |
| 2b | 1 | T13b → `deep` (sequential gate — waits for all Wave 2a) |
| 3 | 10 | T14 → `deep`, T15 → `deep`, T16 → `unspecified-high`, T17 → `deep`, T18 → `unspecified-high`, T19 → `unspecified-high`, T20 → `deep`, T21 → `visual-engineering`, T22 → `visual-engineering`, T23 → `unspecified-high` |
| 4 | 5 | T24 → `deep`, T25 → `unspecified-high`, T26 → `unspecified-high`, T27 → `unspecified-high`, T28 → `deep` |
| 5 | 9 | T29 → `deep`, T30 → `deep` (2,677 lines CLI, deeply tied to schema model), T31a/b/c/d → 4x `deep` (923 tests split into ~230 each, run in parallel), T32 → `deep` (~155K of test code), T33b → `unspecified-high`, T33 → `deep` |
| 6 | 3 | T34 → `writing`, T35 → `writing`, T36 → `quick` |
| FINAL | 4 | F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep` |
| MAINCLOUD | 2 | M1 → `deep`, M2 → `writing` |

* * *

## TODOs

- [ ] 1. Clone repo, remove Swift, reinit as betterspace

  **What to do**:
  - **FIRST ACTION — Create GitHub repo and commit plan**:
    - Create GitHub repo: `gh repo create 1qh/betterspace --public --clone`
    - Copy this plan file to repo root:
      `cp /Users/o/z/lazyconvex/.sisyphus/plans/betterspace-port.md /Users/o/z/betterspace/PLAN.md`
    - Commit and push immediately:
      `git add PLAN.md && git commit -m "docs: add betterspace migration plan" && git push`
    - This PLAN.md is the single source of truth for all subsequent work
  - Clone `/Users/o/z/lazyconvex/` contents into `/Users/o/z/betterspace/` (copy all
    files EXCEPT `.git/` into the already-initialized repo)
  - Delete all Swift-related directories: `desktop/`, `mobile/`, `swift-core/`
  - Delete Swift codegen: `packages/lazyconvex/src/codegen-swift.ts` and
    `codegen-swift-utils.ts`
  - Remove Swift-related CLI command registration (codegen-swift from CLI)
  - Remove Swift-related test files and desktop/mobile test configs
  - Remove Swift dependencies from package.json files
  - Clean up `.github/workflows/ci.yml`:
    - Remove Swift/desktop path filters from `changes` job (`swift:`, `desktop:`
      outputs)
    - Remove ALL Swift/desktop CI jobs: `lint-swift`, `build-swift`, `build-desktop`,
      `test-desktop`, `e2e-desktop`
    - Delete `.swiftlint.yml`, `.swiftformat` config files
  - **DISABLE GitHub Actions entirely**: Rename `.github/workflows/ci.yml` →
    `.github/workflows/ci.yml.disabled` (user will re-enable CI later; all checks are
    reproduced locally via `bun fix` and `bun test:all`, no need to wait for CI on push)
  - Delete `convex.yml` at repo root (self-hosted Convex Docker Compose — replaced by
    our `docker-compose.yml` for SpacetimeDB)
  - Update `turbo.json`: Replace Convex-specific env vars (`CONVEX_SITE_URL`,
    `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_TEST_MODE`, `CONVEX_URL`,
    `SKIP_CONVEX_ENV_TOGGLE`) with SpacetimeDB equivalents (`SPACETIMEDB_URI`,
    `NEXT_PUBLIC_SPACETIMEDB_URI`, `SPACETIMEDB_TEST_MODE`, etc.)
    in both `globalEnv` and `globalPassThroughEnv`
  - Rename package from “lazyconvex” to “betterspace” in all package.json files
  - Rename `packages/lazyconvex/` directory to `packages/betterspace/`
  - Update all import paths referencing “lazyconvex” to “betterspace”
  - Keep shared packages as-is: `packages/fe/` (frontend utils), `packages/ui/`
    (read-only shared components), `tooling/` (ESLint + TypeScript configs)
  - NOTE: `packages/e2e/` has 9 Convex-specific files that will need porting in Task 33b
    — keep for now, port later
  - NOTE: `.git/` already exists from `gh repo create --clone` — do NOT reinit.
    The first commit (PLAN.md) is already pushed.
    After copying lazyconvex files, commit everything as the second commit.
  - Run `bun install` to verify clean dependency resolution
  - Run `bun fix` to verify no lint errors from removals

  **Must NOT do**:
  - Do NOT delete Convex-related code yet — keep as reference
  - Do NOT modify any Convex logic — only remove Swift and rename package
  - Do NOT add SpacetimeDB dependencies yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical file operations — delete directories, rename strings, update
      imports. No complex logic.
  - **Skills**: []
    - No special skills needed for file operations
  - **Skills Evaluated but Omitted**:
    - `git-master`: Not needed — simple `git init`, no complex git operations

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 — Sequential (must complete before anything else)
  - **Blocks**: All subsequent tasks (2-36)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `packages/lazyconvex/package.json` — Package name and exports to rename
  - `packages/lazyconvex/src/codegen-swift.ts` — 2,680 lines of Swift codegen TO DELETE
  - `packages/lazyconvex/src/cli.ts` — CLI command registration (remove codegen-swift
    command)

  **Directories to Delete**:
  - `desktop/` — 4 SwiftCrossUI desktop apps
  - `mobile/` — 4 Skip mobile apps
  - `swift-core/` — Shared Swift protocol + Generated.swift

  **Files to Search for “lazyconvex” references**:
  - All `package.json` files across monorepo
  - All `tsconfig.json` files
  - `AGENTS.md`, `README.md`
  - All import statements in `apps/`, `packages/be/`

  **WHY Each Reference Matters**:
  - Package.json: Must rename to “betterspace” for npm publishing
  - codegen-swift.ts: Largest single file to remove, must also remove its CLI
    registration
  - Import paths: Every consumer file imports from “lazyconvex” and must be updated

  **Acceptance Criteria**:
  - [ ] GitHub repo `1qh/betterspace` exists and is accessible
  - [ ] `PLAN.md` exists at repo root and matches the plan content
  - [ ] No `desktop/`, `mobile/`, `swift-core/` directories exist
  - [ ] No `codegen-swift.ts` file exists
  - [ ] `packages/betterspace/` exists (renamed from `packages/lazyconvex/`)
  - [ ] `grep -r "lazyconvex" --include="*.json" --include="*.ts" --include="*.tsx" .`
    returns zero results (except possibly in reference comments)
  - [ ] No `.swiftlint.yml` or `.swiftformat` files exist
  - [ ] `.github/workflows/ci.yml.disabled` exists (renamed from `ci.yml`)
  - [ ] No active GitHub Actions workflow files in `.github/workflows/`
  - [ ] No `convex.yml` file at repo root
  - [ ] `bun install` succeeds
  - [ ] `bun fix` passes with zero errors
  - [ ] Baseline test count recorded:
    `bun test --reporter=verbose 2>&1 | grep -E "Tests|Suites|files" > .sisyphus/evidence/baseline-test-counts.txt`
    — this is the reference count for “all tests reproduced”

  **QA Scenarios**:

  ```
  Scenario: Clean repo structure after Swift removal
    Tool: Bash
    Preconditions: Clone completed, deletions done
    Steps:
      1. Run `ls desktop/ mobile/ swift-core/` — should fail with "No such file or directory"
      2. Run `find . -name "*.swift" -not -path "./.git/*"` — should return empty
      3. Run `find . -name "codegen-swift*"` — should return empty
      4. Run `cat packages/betterspace/package.json | grep '"name"'` — should show "betterspace"
    Expected Result: All Swift artifacts gone, package renamed
    Failure Indicators: Any Swift file found, or "lazyconvex" still in package.json name field
    Evidence: .sisyphus/evidence/task-1-swift-removal.txt

  Scenario: Build system works after rename
    Tool: Bash
    Preconditions: All renames complete
    Steps:
      1. Run `bun install` — should succeed with no errors
      2. Run `bun fix` — should exit 0
      3. Run `grep -r "lazyconvex" --include="*.json" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .git` — should return empty (or only reference comments)
    Expected Result: Clean build, no stale references
    Failure Indicators: bun install fails, bun fix reports errors, stale "lazyconvex" references found
    Evidence: .sisyphus/evidence/task-1-build-verify.txt
  ```

- [ ] 2. Comprehensive Spike — validate 22 SpacetimeDB assumptions with go/no-go
  criteria

  **What to do**: This is the MOST CRITICAL task in the entire plan.
  It validates every risky architectural assumption before committing to 45+ tasks.
  The spike must produce measurable pass/fail results for each item, and its findings
  feed into 13 decision gates that may add tasks or remove scope.

  **Setup (MANDATORY — must complete before any validation item)**:
  - **FIRST ACTION**: Validate the canonical SpacetimeDB npm package name.
    Run `npm view spacetimedb` AND `npm view @clockworklabs/spacetimedb-sdk`. Record the
    correct package name as FINDINGS.md line 1. If neither exists or a different package
    is canonical, this changes ALL dependency installation instructions across 8+ tasks.
  - Install SpacetimeDB CLI and the validated npm package.
    **CRITICAL**: Install `spacetimedb@^2.0.0` explicitly — NOT just `spacetimedb` —
    because npm has BOTH 1.x (v1.11.4 stable) and 2.0 (v2.0.2) tracks.
    If 2.0 isn’t the `latest` dist-tag yet, bare `bun add spacetimedb` may pull 1.x,
    which breaks TypeScript modules, procedures, views, and event tables.
  - Pin the exact SDK version in spike/package.json — record it in FINDINGS.md.
    This version will be used for the ENTIRE project.
  - Create `spike/` directory with a SpacetimeDB TypeScript module and a minimal React
    app
  - All spike code is THROWAWAY — `rm -rf spike/` at the end, EXCEPT:
    - `spike/FINDINGS.md` → moved to project root
    - `spike/procedure-regression.test.ts` → moved to project root as
      `procedure-regression.test.ts`. This file exercises ALL procedure API patterns
      used in the project (return values, `ctx.withTx()`, `ctx.http.fetch()`, two-phase
      pattern). Run weekly to detect SDK breaking changes if SDK version is ever
      upgraded.

  **22 Validation Items**:

  > **EXECUTION PRIORITY**: Items are numbered for reference, NOT execution order.
  > The spike agent MUST validate these HIGH-RISK items FIRST (they can invalidate the
  > entire plan):
  > 
  > 1. **Item 19** (Monorepo build chain + factory→schema composition + TS feature
  >    parity) — if `spacetime publish` can’t resolve workspace imports or factory
  >    composition doesn’t work, project structure AND CRUD architecture change
  > 2. **Item 20** (Subscription ACL) — if no read-side enforcement, org security model
  >    downgrades
  > 3. **Item 3** (Identity stability) — if same user gets different Identity, ALL
  >    ownership checks break
  > 4. **Item 9** (React SDK audit) — if SDK is too thin, 1-2 week binding layer task
  >    added. Verify exact exports from `spacetimedb/react`.
  > 5. **Item 21** (Event tables) — 2.0 feature that could simplify presence,
  >    notifications, and mutation confirmation Remaining items (1, 2, 4-8, 10-18, 22)
  >    can be validated in any convenient order after these 5.

  **Item 1: Procedure + withTx + auto-inc returns correct ID to client**
  - Create a procedure that inserts a row with auto-increment ID and returns it
  - Verify: client receives the numeric ID via Promise
  - Test rollback: procedure that inserts 2 rows, fails on second — verify NEITHER row
    exists
  - Pass: `spacetime call` returns ID; rolled-back transaction leaves zero rows
  - Fail: ID not returned, or partial writes survive rollback

  **Item 2: Optimistic update pattern + reducer latency measurement**
  - Subscribe to table, call reducer to insert row
  - Measure time between reducer call and subscription update arrival (log timestamps)
  - Build minimal optimistic layer: apply change to React state immediately, reconcile
    when subscription arrives
  - Target: <200ms for local Docker, <500ms for Maincloud
  - Pass: Optimistic insert visible in React state before subscription update; update
    reconciles correctly
  - Fail: Can’t distinguish optimistic vs confirmed state; latency >500ms local
  - **CRITICAL**: If local latency is consistently <100ms, document this — optimistic
    layer may be UNNECESSARY

  **Item 3: SpacetimeAuth Google OAuth end-to-end + identity stability**
  - Set up SpacetimeAuth project with Google OAuth provider
  - Complete OAuth flow: open login → redirect to Google → return to app
  - Verify: `ctx.sender` in reducers matches Identity from SpacetimeAuth
  - **CRITICAL TEST**: Same Google account, login twice (two separate sessions) → MUST
    get SAME Identity
  - Verify session persistence: refresh page → still authenticated
  - Pass: OAuth flow works, identity is stable across sessions, session persists
  - Fail: Different Identity on second login (breaks ALL ownership checks)

  **Item 4: Pre-signed URL file upload/download via procedures**
  - **V8 RUNTIME CONSTRAINT**: SpacetimeDB TypeScript modules run on V8, NOT Node.js.
    There is NO `crypto`, `fs`, `Buffer`, or any Node.js APIs available.
    This means the S3 SDK (which depends on `crypto` for signature generation) likely
    WON’T work inside procedures.
    Test this FIRST — if S3 SDK fails, alternatives: (a) client-side pre-signed URL
    generation using browser Web Crypto API, (b) external signing microservice, (c)
    `ctx.http.fetch()` to an external URL-signing endpoint.
    This is a POTENTIAL BLOCKER for the entire file upload architecture.
  - Create procedure that generates pre-signed S3/R2 PUT URL (crypto, not HTTP — should
    be instant)
  - Upload 1MB file via curl to pre-signed URL
  - Create procedure that generates pre-signed GET URL
  - Download and verify content matches
  - Verify procedure completes within 500ms timeout
  - Pass: Upload + download works, file content matches, procedure under 500ms
  - Fail: S3 SDK not available in V8 runtime (no Node.js `crypto`), or timeout exceeded
    — must use alternative signing approach

  **Item 5: Subscription WHERE filtering + client-side sort/paginate + data size test**
  - Insert 50 rows with varying `status` ('active'/'archived') and `createdAt`
    timestamps
  - Subscribe with `WHERE status = 'active'` — verify only active rows received
  - Sort received rows client-side by `createdAt` DESC — verify order correct
  - Paginate into pages of 10 — verify correct slice
  - Insert new active row → verify appears in subscription without re-subscribe
  - Update row status to ‘archived’ → verify disappears from subscription
  - **DATA SIZE TEST**: Insert 1000 rows, subscribe to 500 (filtered).
    Measure: initial payload time, memory usage
  - Pass: Filtering works, dynamic updates work, 500-row subscription performs
    acceptably
  - Fail: WHERE filtering doesn’t work as documented, or 500 rows causes performance
    issues

  **Item 6: Presence strategy validation — test BOTH approaches (feeds Gate Presence)**
  - **Approach A: Lifecycle events** — Create presence table, use connect/disconnect
    lifecycle callbacks
    - Two browser tabs: Tab A connects and appears in presence; Tab B sees Tab A
    - Close Tab A → Tab B sees presence entry disappear
    - Measure: time from disconnect to removal visible in other client
  - **Approach B: Heartbeat + event-table TTL** — Create ephemeral event-table for
    presence
    - Client writes presence row periodically (heartbeat every 5s)
    - Rows auto-expire after 15s (TTL)
    - Stop heartbeat → row expires → other clients see removal
    - Measure: time from stop-heartbeat to removal visible in other client
  - **Compare both approaches**: Which is more reliable?
    Which has lower latency?
    Which is simpler?
  - Pass: At least one approach works reliably with <5s removal latency
  - Fail: BOTH approaches unreliable — presence feature needs fundamental rethinking

  **Item 7: View subscriptions for computed/joined queries**
  - Create view:
    `blog_with_author = SELECT b.*, u.name FROM blog b JOIN users u ON b.owner = u.identity`
  - Subscribe to view from React client
  - Insert new blog post → verify joined result appears via subscription delta
  - Update user name → verify `blog_with_author` reflects new name in subscription
  - **CRITICAL**: Do views support subscription deltas (onInsert/onUpdate/onDelete)?
  - Pass: View subscriptions work with deltas; joined data updates reactively
  - Fail: Views are query-only (no subscription) — document as blocker, propose
    alternative (manual join from two table subscriptions)

  **Item 8: Docker local dev workflow**
  - `docker compose up -d` with healthcheck
  - `spacetime publish --server http://localhost:3000 spike-module` succeeds
  - `spacetime sql spike-module "SELECT 1"` returns result
  - React app connects to localhost:3000, renders data
  - Modify module code → republish → verify changes take effect without restart
  - `docker compose down` → `docker compose up` → verify data persists (volume mount)
  - Pass: Full dev workflow works end-to-end
  - Fail: Docker image issues, publish fails, data doesn’t persist

  **Item 9: React SDK capability audit [NEW — #1 RISK]**
  - Document EXACTLY what SpacetimeDB’s React SDK (`spacetimedb/react`) provides
  - List every hook and component: useTable, useSpacetimeDB, SpacetimeDBProvider, where,
    eq, and, or — what else?
  - Identify gaps vs what betterspace needs: loading states?
    error states? skip conditions?
    identity-aware caching?
  - Compare to Convex React SDK: `useQuery`, `useMutation`, `usePaginatedQuery`,
    `ConvexProvider`
  - **CRITICAL**: If the React SDK is missing core primitives, building a React binding
    layer is the SINGLE HARDEST task
  - Report: “SpacetimeDB’s React SDK provides X. It’s missing Y. Building Y will take
    approximately Z days.”
  - Pass: React SDK provides sufficient primitives (useTable with WHERE, callbacks,
    provider)
  - Fail: React SDK is thin/nonexistent — triggers Gate 1 (add binding layer task)

  **Item 10: Reducer error propagation to client [NEW]**
  - Throw `SenderError("NOT_FOUND: Blog with id 999")` in a reducer
  - Verify: does the client receive the error?
    As what type?
  - Test: Can you send structured error data (error code + message + metadata)?
    Or just a string?
  - Compare to lazyconvex’s `ConvexError` with typed error codes
  - Pass: Client receives error with at least a parseable message string
  - Fail: Errors are swallowed or arrive as generic “reducer failed” — typed error
    system needs rethinking

  **Item 11: Multi-subscription management [NEW]**
  - Open 5 simultaneous subscriptions to the same table with different WHERE clauses
  - Verify: do they all work independently?
    Do they share a WebSocket connection?
  - Measure: connection overhead per subscription
  - Insert a row that matches 2 of the 5 subscriptions — verify both receive the update
  - Unsubscribe from 1 — verify others continue working
  - Pass: Multiple independent subscriptions work without issues
  - Fail: Subscriptions conflict, or significant overhead per subscription

  **Item 12: Test auth bypass — deterministic Identity generation for automated testing
  [NEW — CRITICAL]**
  - Connect to SpacetimeDB WITHOUT going through OAuth (raw WebSocket or anonymous
    connect)
  - Verify: does the connection get a stable Identity?
    Can you control/predict the Identity?
  - Test: create 3 simultaneous connections with different Identities — verify they can
    interact (user A creates, user B reads, user C is denied)
  - Test: seed a users table row linked to a specific Identity programmatically
  - **IMPLEMENTATION HINT (Oracle round 6)**: SpacetimeDB has a `/v1/identity` HTTP
    endpoint that can mint Identity tokens — test whether this can be used to generate
    deterministic test Identities without OAuth.
    This is likely the most promising path for test auth bypass.
  - **CRITICAL**: If deterministic Identity generation is NOT possible:
    - Can SpacetimeAuth be configured in “test mode” (auto-approve without real OAuth)?
    - Can you create a mock auth layer that assigns Identities?
    - Does SpacetimeDB have an admin API to create Identity tokens?
      (Try `/v1/identity` endpoint first)
  - Pass: Can generate deterministic test Identities without real OAuth.
    Multiple simultaneous test users work.
  - Fail: No way to bypass OAuth for testing — test strategy needs complete rethinking
    (possibly separate auth service, or all tests share single Identity)

  **Item 13: Server-side data fetching / SSR story [NEW]**
  - Investigate whether SpacetimeDB’s HTTP query API or PGWire can be used for Next.js
    server-side data fetching
  - Test: from a Next.js Server Component (or plain Node.js script), fetch data from
    SpacetimeDB without WebSocket
  - Options to test: HTTP query endpoint (`/v1/database/{db}/sql`), PGWire connection
    via `pg` npm package
  - Pass: At least one method works for SSR — document the pattern (which API,
    connection setup, query format)
  - Fail: No server-side data fetching possible — document the limitation.
    Demo apps will use client-only data loading (acceptable, but note the UX tradeoff of
    flash-of-empty-state)

  **Item 14: Scheduled reducer / delayed execution [NEW]**
  - Test whether SpacetimeDB supports scheduling a reducer to execute after a delay
    (needed for cacheCrud TTL)
  - **IMPLEMENTATION HINT (Oracle round 6)**: SpacetimeDB 2.0 supports scheduled
    reducers via scheduled tables with `t.scheduleAt()` column and
    `table({ scheduled: 'reducer_name' })` syntax.
    Test this pattern first — create a scheduled table, insert a row with `scheduleAt`
    set to `now + 5s`, verify the linked reducer fires automatically after the delay.
  - Try: scheduled tables with `t.scheduleAt()` (primary), or `ctx.schedule()` if
    available
  - If no native scheduling: test workaround — client-side setTimeout that calls a
    reducer, or polling-based expiration check
  - Pass: Delayed reducer execution works natively (via scheduled tables) or via
    reliable workaround
  - Fail: No scheduling mechanism — cacheCrud TTL design needs rethinking (client-side
    expiration only)

  **Item 15: WebSocket reconnection + subscription recovery [NEW]**
  - Establish subscription, receive data, then kill WebSocket connection (simulate
    network blip)
  - Reconnect — verify subscription state is recovered (full re-sync or delta?)
  - Measure: time to recover subscription state after reconnection
  - Test: during disconnection, another client inserts rows — verify reconnected client
    receives them
  - Pass: Automatic reconnection with subscription recovery works
  - Fail: Manual reconnection needed — document the pattern for all hooks to handle

  **Item 16: Multi-module structure for demo apps [NEW]**
  - Test whether multiple demo apps (blog + chat tables) can coexist in a single
    SpacetimeDB module without reducer/table name collisions
  - If collisions occur: test multi-module deployment on one instance (separate modules
    per app)
  - Document: single module for all apps vs one module per app vs shared module +
    app-specific modules
  - Pass: Clear decision on module structure with tested evidence
  - Fail: Neither approach works cleanly — architectural rethink needed

  **Item 17: Procedure external HTTP reliability under 500ms
  [NEW — CRITICAL for movie app]**
  - Create procedure that calls a real external API (e.g., TMDB-like public API or
    httpbin.org)
  - Make 20 sequential calls — record success rate and p95 latency
  - Test: does `ctx.http.fetch()` work reliably inside a procedure?
    What happens when the external API is slow (>400ms)?
  - Test error handling: what happens when the external API returns 500? When it times
    out?
  - Test: can you do HTTP fetch + write to DB in the same procedure (with separate
    `ctx.withTx()`)?
  - Pass: ≥95% success rate, p95 latency <500ms, error handling works predictably
  - Fail: Frequent failures, unpredictable timeouts, can’t combine HTTP + DB writes —
    movie app’s cache pattern needs complete redesign (possibly external worker/proxy
    instead of procedures)

  **Item 18: Generated TypeScript bindings type shapes + u32 vs u64 trade-off
  [NEW — CRITICAL for forms/URLs/JSON]**
  - Run `spacetime generate` on a module with diverse column types: `t.u64()`,
    `t.u32()`, `t.i32()`, `t.string()`, `t.bool()`, `t.timestamp()`, `t.identity()`,
    `t.bytes()`, `t.option.u64()`
  - Inspect generated TypeScript types: is `u64` → `bigint` or `number`? Is `u32` →
    `number`? Is `timestamp` → `Date` or `number`?
  - **u32 vs u64 comparison for auto-inc IDs**: Create two tables — one with
    `id: t.u64().primaryKey().autoInc()`, one with `id: t.u32().primaryKey().autoInc()`.
    Compare:
    - Which produces `bigint` vs `number` in generated bindings?
    - Which works with `JSON.stringify()` without custom serializer?
    - Which works in URL params without coercion?
    - Which works with `<input type="number">` in React forms?
    - Which works as React key directly?
    - **Recommendation**: If u32 → number and works everywhere, use u32 for all auto-inc
      IDs (max ~4.2B rows per table — sufficient for all demo apps).
      Document u64 as opt-in for tables expecting >4.2B rows.
  - Test JSON serialization roundtrip: `JSON.stringify(row)` → `JSON.parse(result)` — do
    `bigint` values survive?
    (bigint is NOT JSON-serializable by default — `JSON.stringify({id: 1n})` throws
    TypeError)
  - Test URL param roundtrip: can you put a row’s ID in a URL (`/blog/${id}`) and parse
    it back?
  - Test React form integration: can Zod validate the generated types?
    Can `<input type="number">` handle `bigint`?
  - Test: `identity` type — is it a string, Buffer, or custom class?
    Can it be used as React key?
    Stored in localStorage?
    Test `Identity.toHexString()` and `Identity.isEqual()` methods.
  - Document the EXACT type mapping: SpacetimeDB type → TypeScript type → JSON shape →
    URL-safe shape → Zod schema
  - Pass: All types have clear, usable TypeScript representations with documented
    serialization patterns.
    u32/u64 trade-off documented.
  - Fail: `bigint` breaks JSON/URL/forms without custom serializers AND u32 also breaks
    — need a serialization utility layer (add to Wave 1)

  **Item 19: Monorepo + Bun + SpacetimeDB module build chain
  [NEW — CRITICAL for integration]**
  - **IMPLEMENTATION HINT (Oracle round 6)**: SpacetimeDB TypeScript modules use
    `src/index.ts` as the entry point.
    The module pattern is
    `schema({}) → table() → spacetimedb.reducer() → export default spacetimedb`. Ensure
    the spike tests this exact structure for factory composition — factories must
    produce definitions that compose into a single `schema({})` call exported from
    `src/index.ts`.
  - Test whether SpacetimeDB TypeScript modules can be built and published from within a
    Bun monorepo workspace
  - Create a SpacetimeDB module inside `packages/be/` (or equivalent) that imports
    types/utilities from `packages/betterspace/`
  - Run `spacetime publish` — does it resolve monorepo workspace imports?
    Or does it need a separate build step?
  - Test: after publishing, run
    `spacetime generate --lang typescript --out-dir packages/betterspace/src/generated/`
    — do generated bindings work when imported from React app?
  - Test the full chain: edit module → publish → generate → import in React → works?
  - **CRITICAL**: If `spacetime publish` cannot resolve Bun workspace imports:
    - Can you use `bun build` to bundle the module first, then publish the bundle?
    - Does SpacetimeDB accept pre-bundled TypeScript modules?
    - Do we need a separate `tsconfig.json` for the SpacetimeDB module that resolves
      workspace paths?
  - **Verify what `spacetime publish` accepts**: TypeScript sources directly?
    Pre-bundled JS? Does it run its own TS compilation?
    This determines whether `packages/be` needs a separate build step.
  - **Verify TypeScript module feature parity**: Do TypeScript modules support ALL
    features needed — procedures, views, event tables, scheduled reducers?
    If any feature is Rust-only, document as a blocker and estimate impact.
  - **Test factory→schema composition pattern**: SpacetimeDB 2.0 uses
    `schema({}) → spacetimedb.reducer()` pattern where tables are inside `schema({})`
    and reducers are created via `spacetimedb.reducer()`. Test whether factory-generated
    reducer definitions can compose into a single `schema({})` +
    `export default spacetimedb` pattern.
    If not, the CRUD factory architecture (Tasks 7-11) needs redesign — factories may
    need to return table config + reducer factory functions that `setup.ts` (Task 13b)
    composes into one module.
  - Document: exact build commands, required configs, any workspace-specific gotchas
  - Pass: Full chain works (edit → publish → generate → import → use).
    Monorepo workspace imports resolve.
    TypeScript modules have feature parity.
    Factory composition works.
  - Fail: `spacetime publish` cannot resolve workspace imports — need custom build
    pipeline (estimate effort).
    OR TypeScript modules lack critical features — document which ones and impact.

  **Measurements to Record (MANDATORY)**:
  - Reducer call → subscription update latency (ms) — local Docker
  - Initial subscription payload time for 50/500/1000 rows (ms)
  - Memory usage with 500-row subscription (MB)
  - Concurrent subscription count before performance degrades
  - Pinned SDK version (`spacetimedb` npm package version)
  - SSR feasibility (HTTP query API latency, PGWire connection success)
  - Scheduled reducer support (native/workaround/none)
  - WebSocket reconnection recovery time (ms)
  - Test Identity generation method (anonymous connect/admin API/mock auth)
  - Procedure HTTP fetch success rate (% of 20 calls) and p95 latency (ms)
  - Generated type mapping table: SpacetimeDB type → TypeScript type → JSON shape → URL
    shape
  - bigint serialization workaround needed (YES/NO) — if YES, estimate effort for
    serialization layer
  - u32 vs u64 auto-inc recommendation: which to use by default and why
  - Monorepo build chain: does `spacetime publish` resolve workspace imports?
    Build pipeline needed?
  - **Built-in audit**: For each of the 22 items, document what SpacetimeDB provides
    natively vs what needs custom code

  **Item 21: Event Tables for transient data
  [NEW — SpacetimeDB 2.0 feature NOT in plan]**
  - SpacetimeDB 2.0 introduces “event tables” — a new table type for publishing
    transient events to subscribers.
    Test:
    - Create an event table, publish an event, verify subscriber receives it
    - Verify events are transient (not persisted) — they only reach connected
      subscribers
    - Test if event tables can replace heartbeat-based presence (Task 20) — publish
      presence as events, subscribers see who’s active
    - Test if event tables can signal mutation completion to callers (Task 18 —
      optimistic update confirmation)
    - Test if event tables work for real-time notifications (org invites, join requests)
  - Document: event table API, delivery guarantees, subscriber behavior on reconnection
    (do missed events replay?)
  - Pass: Event tables work and are a viable mechanism for at least one of: presence,
    notifications, or mutation confirmation
  - Fail: Event tables are too limited, unreliable, or not yet available in TypeScript
    SDK — use regular tables with TTL instead

  **Item 22: `spacetime dev` unified command evaluation [NEW — may simplify Task 6]**
  - SpacetimeDB offers `spacetime dev` which auto-starts server, publishes module,
    generates bindings, and starts dev server
  - Test: does `spacetime dev` work with a Bun monorepo?
    Does it handle workspace imports?
  - Compare DX: `spacetime dev` vs manual scripts (`spacetime:up`, `spacetime:publish`,
    `spacetime:generate`)
  - If `spacetime dev` works well: simplify Task 6 to use it as the primary dev command,
    keeping manual scripts as fallbacks
  - If `spacetime dev` doesn’t work with monorepo: document why and keep manual scripts
    as primary approach
  - Pass: `spacetime dev` works with monorepo and improves DX
  - Fail: `spacetime dev` incompatible with monorepo — manual scripts remain primary

  **Item 20: Subscription access control / read-side ACL enforcement
  [NEW — CRITICAL for multi-tenant security]**
  - **IMPLEMENTATION HINT (Oracle round 6)**: SpacetimeDB supports **private tables +
    public views** as the primary read-side ACL path.
    Private tables are not directly subscribable by clients.
    Views CAN be subscribed to and CAN filter by `ctx.sender` Identity — this is the
    recommended approach.
    Test: (1) Create a private table, (2) Create a view over it filtered by
    `ctx.sender`, (3) Verify clients can subscribe to the view but NOT the base table,
    (4) Verify the view only returns rows matching the subscriber’s Identity.
  - Test whether SpacetimeDB enforces subscription access at the server level:
    - Can a client subscribe to ANY table with ANY WHERE clause?
      Or can tables be marked private?
    - If Client A subscribes to `users` without a WHERE filter, does it receive ALL rows
      (including other orgs)?
    - Can views restrict subscription access (e.g., a view that filters by `ctx.sender`
      Identity)?
    - Can SpacetimeDB’s row-level security or table permissions prevent unauthorized
      reads?
  - **Security test**: Create a table with rows owned by 2 different Identities.
    From Client A (Identity 1), subscribe to the full table — can Client A see Client
    B’s rows?
  - **CRITICAL for orgCrud**: If clients can subscribe to base tables freely, then
    orgCrud’s ACL only enforces WRITE access (reducers check ownership/role).
    READ access is uncontrolled — a malicious client could subscribe to
    `org_documents WHERE org_id = 'competitor-org'` and read everything.
  - Document: what a malicious client CAN do (subscribe broadly, query other orgs, read
    other users’ data)
  - **Mitigation strategies to evaluate**: (a) Private tables + views that filter by
    `ctx.sender` — clients can only subscribe to safe views (b) Procedures-only reads —
    never expose tables directly, all reads go through procedures that check permissions
    (c) Separate modules per org — physical isolation (d) Accept client-side trust for
    demo apps (document as known limitation for production)
  - Pass: At least one mitigation strategy works reliably.
    Document which approach to use.
  - Fail: No server-side read enforcement exists — orgCrud/ACL scope must be reduced
    (write-only enforcement) and documented as known security limitation.

  **Built-in Audit (MANDATORY for spike — feeds into every subsequent task)**: For each
  validation item, document in FINDINGS.md a “Built-in Audit” section:
  - What does SpacetimeDB provide **out of the box** for this concern?
  - What custom code is **actually needed** vs what we can skip?
  - Estimate effort saved by leveraging built-ins.
    Example: “Item 5 (Filtering): SpacetimeDB’s `useTable` with `where(eq(...))` handles
    server-side filtering natively.
    We do NOT need to build custom filter utilities for server-side filtering.
    Client-side sort/paginate still needed.”
    Example: “Item 15 (Reconnection): SpacetimeDB SDK handles WebSocket reconnection and
    subscription recovery automatically.
    We do NOT need custom retry/reconnection logic in hooks.”
    The Gate Decision Report (oracle agent) should use this audit to REMOVE or SIMPLIFY
    tasks where SpacetimeDB’s built-ins are sufficient.

  **Rate Limiting Audit (MANDATORY)**: lazyconvex has per-user rate limiting deeply
  embedded in ALL CRUD factories (`checkRateLimit` in crud.ts, orgCrud, singletonCrud,
  cacheCrud). The spike MUST determine:
  - Does SpacetimeDB have infrastructure-level rate limiting?
    (per-connection, per-Identity)
  - If YES → use it, remove custom rate limiting code
  - If NO → options: (a) reimplement via SpacetimeDB table tracking request counts per
    Identity, (b) defer to post-v1, (c) drop rate limiting for demo apps (document as
    known limitation). Record decision in FINDINGS.md.

  **Must NOT do**:
  - Do NOT build production-quality code — this is throwaway validation
  - Do NOT port any lazyconvex code — just test SpacetimeDB APIs directly
  - Do NOT spend time on styling or UX — bare minimum UI
  - Do NOT keep spike code after validation — `rm -rf spike/` at end, only FINDINGS.md
    survives
  - Do NOT assume lazyconvex features need reimplementation — if SpacetimeDB provides it
    natively, document that and skip

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Exploratory work requiring research, API experimentation, and
      documentation of findings.
      Needs autonomous problem-solving when docs are incomplete.
      Must produce quantified measurements, not just “it works.”
  - **Skills**: [`playwright`]
    - ```
      `playwright`: Needed for React subscription verification (Items 2, 5, 6, 7, 9, 11, 15)
      ```
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not needed — bare minimum UI

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 0 — Sequential (must complete before Decision Gates)
  - **Blocks**: Decision Gates → Tasks 3-36
  - **Blocked By**: Task 1 (needs clean betterspace repo)

  **References**:

  **External References**:
  - SpacetimeDB TypeScript Module Reference:
    https://spacetimedb.com/docs/modules/typescript
  - SpacetimeDB Procedures: https://spacetimedb.com/docs/procedures
  - SpacetimeDB Subscriptions: https://spacetimedb.com/docs/subscriptions
  - SpacetimeDB Subscription Semantics:
    https://spacetimedb.com/docs/subscriptions/semantics
  - SpacetimeDB SQL Reference: https://spacetimedb.com/docs/sql (subscription SQL vs
    query SQL differences)
  - SpacetimeDB React Client Quickstart:
    https://spacetimedb.com/docs/sdks/typescript/quickstart
  - SpacetimeAuth Overview: https://spacetimedb.com/docs/spacetimeauth
  - SpacetimeAuth React Integration:
    https://spacetimedb.com/docs/spacetimeauth/react-integration
  - SpacetimeDB PGWire: https://spacetimedb.com/docs/how-to/pg-wire
  - SpacetimeDB Docker Hub: https://hub.docker.com/r/clockworklabs/spacetime

  **Pattern References** (lazyconvex patterns to validate against):
  - `packages/betterspace/src/server/crud.ts` — CRUD factory pattern (what must be
    replicated)
  - `packages/betterspace/src/react/use-list.ts` — Client-side pagination pattern
  - `packages/betterspace/src/react/use-search.ts` — Search implementation
  - `packages/betterspace/src/react/use-presence.ts` — Presence pattern
  - `packages/betterspace/src/server/cache-crud.ts` — Caching pattern to evaluate
  - `packages/betterspace/src/react/optimistic-store.ts` — Optimistic update pattern
  - `packages/betterspace/src/server/types.ts` — Type system and error types

  **WHY Each Reference Matters**:
  - Module docs: Core API for table/reducer/view/procedure definitions
  - Procedures docs: Return values, HTTP requests, withTx patterns — critical for CRUD
  - Subscription docs: SQL limitations, delta updates, multi-subscription behavior
  - SQL reference: Exact subscription SQL capabilities (WHERE only, no LIMIT/OFFSET)
  - React quickstart: `useTable`, `where`, `SpacetimeDBProvider` patterns
  - SpacetimeAuth: Google OAuth flow, identity stability
  - lazyconvex source: Understand WHAT patterns need SpacetimeDB equivalents

  **Acceptance Criteria**:
  - [ ] All 22 validation items tested with documented pass/fail
  - [ ] Latency measurements recorded (reducer round-trip, subscription update, initial
    payload)
  - [ ] React SDK capabilities fully documented (every hook, every gap)
  - [ ] Identity stability confirmed (same OAuth user = same Identity across sessions)
  - [ ] SDK version pinned and recorded
  - [ ] `spike/FINDINGS.md` completed with sections: “Works As Expected”, “Doesn’t
    Work”, “Works Differently Than Assumed”, “Measurements”, “Decision Gate Inputs
    (Gates 1-11)”
  - [ ] Test auth bypass method documented (Gate 6 input)
  - [ ] SSR feasibility documented (Gate 7 input)
  - [ ] Scheduled reducer support documented (Gate 8 input)
  - [ ] WebSocket reconnection behavior documented
  - [ ] Module structure decision documented (single vs multi-module)
  - [ ] Built-in audit completed: each item documents what SpacetimeDB provides natively
    and what custom code is needed
  - [ ] FINDINGS.md includes “Features We Can Skip” section listing lazyconvex features
    that SpacetimeDB handles natively
  - [ ] Spike code deleted (`rm -rf spike/`), FINDINGS.md moved to project root

  **QA Scenarios**:

  ```
  Scenario: Procedure returns auto-inc ID to client (Item 1)
    Tool: Bash
    Preconditions: SpacetimeDB running locally via Docker, module published
    Steps:
      1. Call procedure: `spacetime call betterspace-spike create_blog '{"title":"Test","content":"Hello"}'`
      2. Verify output contains a numeric ID (e.g., 1)
      3. Run `spacetime sql betterspace-spike "SELECT * FROM blog WHERE id = 1"` — should return 1 row
      4. Call rollback test procedure that inserts 2 rows but fails on second
      5. Run `spacetime sql betterspace-spike "SELECT COUNT(*) FROM blog WHERE title = 'rollback-test'"` — should be 0
    Expected Result: ID returned to client; rollback leaves zero partial rows
    Failure Indicators: No ID in output; partial writes survive rollback
    Evidence: .sisyphus/evidence/task-2-procedure-return.txt

  Scenario: Real-time subscription with filtering (Item 5)
    Tool: Playwright (playwright skill)
    Preconditions: Spike React app running, 50 rows inserted (25 active, 25 archived)
    Steps:
      1. Navigate to spike app
      2. Verify only 25 active items shown (filtered by WHERE status = 'active')
      3. Via spacetime call, insert new active row
      4. Verify new row appears in UI within 2 seconds without refresh
      5. Via spacetime call, update an active row to archived
      6. Verify row disappears from UI within 2 seconds
    Expected Result: Server-side WHERE filtering works, delta updates push automatically
    Failure Indicators: All 50 rows shown (no filtering), or manual refresh needed
    Evidence: .sisyphus/evidence/task-2-subscription-filter.png

  Scenario: Identity stability across OAuth sessions (Item 3)
    Tool: Playwright (playwright skill)
    Preconditions: SpacetimeAuth project configured with Google OAuth
    Steps:
      1. Complete Google OAuth login, record Identity from ctx.sender (via a "whoami" reducer)
      2. Clear session/localStorage, log out
      3. Complete Google OAuth login again with SAME Google account
      4. Record Identity from ctx.sender again
      5. Compare: Identity from step 1 MUST equal Identity from step 4
    Expected Result: Same Google account always produces same Identity
    Failure Indicators: Different Identity on second login
    Evidence: .sisyphus/evidence/task-2-identity-stability.txt

  Scenario: Multi-subscription independence (Item 11)
    Tool: Playwright (playwright skill)
    Preconditions: Spike React app with 5 subscription components, each with different WHERE
    Steps:
      1. Open app, verify all 5 subscriptions show correct filtered data
      2. Insert row matching subscriptions 1 and 3 but not 2, 4, 5
      3. Verify only subscriptions 1 and 3 update
      4. Unsubscribe from subscription 2 (unmount component)
      5. Insert another row — verify remaining 4 subscriptions still work
    Expected Result: 5 independent subscriptions coexist without interference
    Failure Indicators: Wrong subscription receives update, or unsubscribe breaks others
    Evidence: .sisyphus/evidence/task-2-multi-subscription.png

  Scenario: Test auth bypass — deterministic Identity generation (Item 12)
    Tool: Bash
    Preconditions: SpacetimeDB running locally via Docker
    Steps:
      1. Connect to SpacetimeDB anonymously (no OAuth) — record the Identity assigned
      2. Disconnect, reconnect anonymously — check if Identity is the same or different
      3. Open 3 simultaneous connections — verify each gets a unique Identity
      4. From connection 1: create a row with owner = ctx.sender
      5. From connection 2: attempt to read the row — should succeed
      6. From connection 3: attempt to update the row — should fail (not owner)
    Expected Result: Deterministic or at least stable Identities for test users; multi-user scenarios work
    Failure Indicators: Cannot connect without OAuth; Identities are unpredictable; multi-connection fails
    Evidence: .sisyphus/evidence/task-2-test-auth-bypass.txt

  Scenario: Server-side data fetching for SSR (Item 13)
    Tool: Bash
    Preconditions: SpacetimeDB running, module published with test data
    Steps:
      1. Use curl to query HTTP endpoint: `curl http://localhost:3000/v1/database/betterspace-spike/sql -d "SELECT * FROM blog LIMIT 10"`
      2. Verify response contains JSON rows
      3. Test PGWire: `psql -h localhost -p 5432 -c "SELECT * FROM blog LIMIT 10"` (or equivalent)
      4. From Node.js script: `import pg from 'pg'; const client = new pg.Client(...); await client.query('SELECT * FROM blog');`
    Expected Result: At least one server-side query method works
    Failure Indicators: HTTP query returns error; PGWire port not exposed; no way to query without WebSocket
    Evidence: .sisyphus/evidence/task-2-ssr-feasibility.txt

  Scenario: Scheduled reducer / delayed execution (Item 14)
    Tool: Bash
    Preconditions: SpacetimeDB running, module published
    Steps:
      1. Write a reducer that schedules another reducer to run after 5 seconds (try `ctx.schedule()` or equivalent)
      2. Call the scheduling reducer
      3. Wait 6 seconds
      4. Query: `spacetime sql betterspace-spike "SELECT * FROM scheduled_results"` — should have 1 row created by the scheduled reducer
    Expected Result: Scheduled reducer executed after delay
    Failure Indicators: `ctx.schedule` doesn't exist; no row created after delay
    Evidence: .sisyphus/evidence/task-2-scheduled-reducer.txt

  Scenario: WebSocket reconnection + subscription recovery (Item 15)
    Tool: Playwright (playwright skill)
    Preconditions: Spike React app with active subscription showing data
    Steps:
      1. Open app, verify subscription data shows (e.g., 5 blog posts)
      2. Simulate network disconnect (page.context().setOffline(true))
      3. From another terminal: `spacetime call betterspace-spike create_blog '{"title":"During Disconnect"}'`
      4. Reconnect (page.context().setOffline(false))
      5. Wait up to 10 seconds
      6. Verify the "During Disconnect" row appears in the UI
    Expected Result: Subscription recovers automatically, missed data syncs
    Failure Indicators: Data doesn't appear after reconnection; requires manual page refresh
    Evidence: .sisyphus/evidence/task-2-reconnection.png

  Scenario: Multi-module structure for demo apps (Item 16)
    Tool: Bash
    Preconditions: SpacetimeDB running
    Steps:
      1. Create module A with tables: blog, users, blog_create reducer
      2. Create module B with tables: chat_messages, users, send_message reducer
      3. Attempt to publish both as single module — check for naming collisions on "users" table
      4. If collision: publish as separate modules (betterspace-blog, betterspace-chat)
      5. Verify both modules are accessible from same client
    Expected Result: Clear evidence for single-module vs multi-module decision
    Failure Indicators: Table name collision causes publish failure with no workaround
    Evidence: .sisyphus/evidence/task-2-module-structure.txt

  Scenario: Procedure external HTTP reliability (Item 17)
    Tool: Bash
    Preconditions: SpacetimeDB running, module with HTTP-calling procedure published
    Steps:
      1. Create procedure that calls `https://httpbin.org/get` via `ctx.http.fetch()`
      2. Call procedure 20 times sequentially, record success/fail and latency for each
      3. Calculate: success rate, p50, p95, p99 latency
      4. Create procedure that calls HTTP + writes to DB via `ctx.withTx()`
      5. Call it 5 times — verify both HTTP response AND DB write succeed
      6. Create procedure that calls a slow endpoint (httpbin.org/delay/2) — verify timeout behavior
    Expected Result: ≥95% success, p95 <500ms, HTTP+DB combo works
    Failure Indicators: <90% success, p95 >500ms, HTTP+DB impossible
    Evidence: .sisyphus/evidence/task-2-http-reliability.txt

  Scenario: Generated TypeScript binding types (Item 18)
    Tool: Bash
    Preconditions: Module with diverse column types published, `spacetime generate` run
    Steps:
      1. Run `spacetime generate --lang typescript --out-dir spike/generated`
      2. Inspect generated types: what is u64? (bigint or number?) timestamp? identity?
      3. Write TS script: create a row, get it back, `JSON.stringify(row)` → parse → compare
      4. Test: put row ID in URL string `/blog/${id}` → extract from URL → use in query
      5. Test: create Zod schema for the generated type → validate a row → check result
      6. Test: use identity value as React key in JSX → verify no warnings
    Expected Result: All types documented, serialization patterns clear
    Failure Indicators: JSON.stringify fails on bigint, URL params lose precision, Zod can't validate
    Evidence: .sisyphus/evidence/task-2-binding-types.txt
  ```

* * *

### Decision Gates (between Task 2 and Wave 1)

> After the spike completes, these 13 binary gates determine whether the plan needs
> modification. Each gate has a clear IF/THEN that adds tasks or removes scope.
> The spike agent MUST provide explicit answers for each gate in FINDINGS.md.
> 
> **Gate Executor**: After Task 2 completes, an `oracle` agent reads FINDINGS.md and
> produces a Gate Decision Report.
> Gate decisions modify the task list before Wave 1 dispatch.
> This is a **mandatory synchronization point** — no Wave 1 task starts until all 13
> gates have a documented decision.
> The oracle agent updates the plan file directly with gate outcomes.
> 
> **Built-in Audit Integration**: The Gate Decision Report MUST incorporate the spike’s
> Built-in Audit. If SpacetimeDB provides a feature natively, the oracle agent should
> SIMPLIFY or REMOVE the corresponding task.
> Examples: if subscriptions auto-cache → simplify cacheCrud (Task 11). If SDK handles
> reconnection → remove retry logic from hooks.
> If `where(eq(...))` handles filtering → simplify filter utilities in Task 5.

**Gate 1: React SDK Gap**
- IF SpacetimeDB React SDK is missing core primitives (loading states, error states,
  skip conditions): → Add Task 2b: “Build SpacetimeDB React binding layer” to Wave 1
  (blocks all React tasks in Wave 3) → Estimated additional effort: 1-2 weeks
- ELSE: Proceed as planned.

**Gate 2: View Subscriptions**
- IF views DON’T support subscription deltas (onInsert/onUpdate/onDelete): → Add Task
  7b: “Build client-side multi-table join utility” to Wave 2a (new task) → Modify Task
  14 (useList) instructions: accept multi-subscription data instead of view
  subscriptions → Modify Task 7 (crud factory): do not generate view-based read paths,
  use multi-table subscription joins → Affects: Tasks 7, 8, 9, 14, 15, 16, 25-28 (all
  tasks that reference views for enriched data) → Estimated additional effort: 3-5 days
- ELSE: Proceed as planned.

**Gate 3: Identity Stability**
- IF same OAuth user gets different Identity across sessions: → Add users table
  intermediary to ALL CRUD factories.
  Change ALL ownership patterns.
  → This is a FUNDAMENTAL change affecting every reducer/procedure.
- ELSE: Proceed as planned (use ctx.sender directly for ownership).

**Gate 4: cacheCrud Necessity**
- IF SpacetimeDB subscriptions provide sufficient client-side caching: → Simplify
  cacheCrud to thin wrapper or remove entirely.
  Simplify movie demo app.
- ELSE: Port cacheCrud fully.

**Gate 5: Optimistic Update Necessity**
- IF reducer latency is consistently <100ms on local Docker: → Defer custom optimistic
  layer to post-v1. Remove OptimisticProvider, simplify useList/useMutate.
  → Note: Still measure Maincloud latency later — may need optimistic layer for
  Maincloud only.
- ELSE: Build custom optimistic layer as planned in Wave 3.

**Gate 6: Test Auth Bypass** [NEW — CRITICAL]
- **Preferred approach: Deterministic key-material per test user.** Instead of relying
  on “anonymous” randomness, generate stable test Identities from fixed seed material
  (e.g., derive from a known private key or use SpacetimeDB’s admin API to create tokens
  with specific Identities).
  This gives reproducible tests where “Alice” always has the same Identity across test
  runs.
- IF deterministic test Identity generation works (Spike Item 12) — either via
  key-material derivation or admin API: → Proceed as planned.
  Task 13d builds test helpers using deterministic Identity generation.
  → Test helper API: `createTestUser("alice")` → always returns same Identity.
- IF Identity generation does NOT work deterministically but anonymous connections
  provide stable Identities per connection: → Acceptable fallback.
  Task 13d stores anonymous Identities per test session.
  → Modify Task 13d: add Identity persistence across test runs (save to file).
- IF SpacetimeAuth has a test mode or admin API for Identity assignment: → Modify Task
  13d: add SpacetimeAuth test mode setup as prerequisite → Add test auth configuration
  to docker-compose.yml
- IF NO auth bypass mechanism exists AND anonymous Identities are random/unstable: →
  FUNDAMENTAL CHANGE: All test tasks (31, 32, 33) need redesign.
  Options: (a) All tests use single shared Identity (limits multi-user testing) (b)
  Build mock auth proxy that assigns Identities from deterministic key-material (c) Use
  SpacetimeAuth real OAuth with test Google accounts (slow, flaky) → Add Task 13e:
  “Build test auth solution” to Wave 2a

**Gate 7: SSR / Server-Side Data Fetching** [NEW]
- IF HTTP query API or PGWire works for SSR (Spike Item 13): → Add SSR data fetching
  utility to Task 5 (helpers/utilities) → Update demo app tasks (25-28) to include SSR
  data loading for initial page renders → Add SSR pattern to Task 34 (documentation)
- IF NO server-side data fetching possible: → Document limitation in plan: demo apps use
  client-only data loading → Update Task 22 (components) to add loading skeleton
  components for flash-of-empty-state → Add “Known Limitation: No SSR” to Task 34
  (documentation) → This is ACCEPTABLE — not a blocker, just a UX tradeoff

**Gate 8: Scheduled Reducers** [NEW]
- IF SpacetimeDB supports scheduled/delayed reducer execution (Spike Item 14): → Proceed
  as planned for cacheCrud TTL (Task 11)
- IF NO native scheduling but workaround exists (client-side timer, polling): → Modify
  Task 11: implement client-side TTL expiration instead of server-side → Document the
  workaround and its limitations
- IF NO scheduling mechanism at all: → Modify Task 11: remove TTL-based expiration.
  Cache entries are manual-invalidate only.
  → Simplify cacheCrud acceptance criteria accordingly

**Gate 9: Procedure HTTP Reliability** [NEW — CRITICAL for movie app]
- IF procedure HTTP fetch has ≥95% success rate and p95 <500ms (Spike Item 17): →
  Proceed as planned. Movie app’s cacheCrud uses procedures for TMDB API calls.
- IF procedure HTTP is unreliable (frequent timeouts, <90% success rate): → FUNDAMENTAL
  CHANGE: Movie app’s external API pattern needs redesign: (a) Add external worker/proxy
  service that fetches APIs and writes to SpacetimeDB via reducers (b) Or use
  client-side fetching + procedure to store results (shifts latency to client) → Add
  Task 11b: “Build external API proxy pattern” to Wave 2a → Modify Task 27 (movie app):
  use proxy pattern instead of direct procedure HTTP → Estimated additional effort: 3-5
  days

**Gate 10: TypeScript Binding Types / Serialization** [NEW — CRITICAL for forms/URLs]
- **Concrete serialization policy**: Standardize on “wire/string form” for all
  non-primitive types.
  IDs, Identities, Timestamps — all have a canonical string representation for URLs,
  JSON, forms, localStorage, and React keys.
  A tiny serializer utility (`toWire(value)` / `fromWire(str, type)`) handles all
  conversions. This is the single place all code goes through — no ad-hoc `toString()`
  calls scattered across the codebase.
- IF u32 auto-inc IDs work (number type, JSON-safe, URL-safe) (Spike Item 18): → Use
  `t.u32()` as default for auto-increment IDs.
  No bigint serialization needed for IDs.
  → **Still standardize `idToWire(id)` / `idFromWire(str)` as trivial `String(id)` /
  `Number(str)` conversions** — this prevents URL/form/storage code from bifurcating if
  a table later opts into `u64`. All code goes through `idToWire`/`idFromWire`, even
  when it’s trivial. → Identity still needs serialization (`.toHexString()` for wire
  form). → Add serializer utility to Task 5 (helpers) for both ID wire form and Identity
  wire form. → Document type mapping in Task 34 (docs).
- IF u32 is insufficient AND u64/bigint is required: → Add Task 3b: “Build type
  serialization utility layer” to Wave 1 (after Task 3) → Serializer handles:
  `bigint ↔ string` (for IDs), `Identity ↔ hex string`, `Timestamp ↔ ISO string` → All
  CRUD factories, hooks, and components must use `toWire(id)` for JSON/URL/form values →
  Modify Task 4 (Zod bridge): include bigint ↔ string coercion for forms → Modify Task
  21 (form components): use serialized IDs in URL params and form values → Estimated
  additional effort: 2-3 days
- IF identity type is not string-like (Buffer/Uint8Array) AND `.toHexString()` doesn’t
  exist: → Add identity binary serialization to Task 3b → Modify ALL ownership checks in
  CRUD factories to use identity comparison utility

**Gate 11: Presence Strategy Reconciliation** [NEW]
- Spike Item 6 tests two approaches: (a) connect/disconnect lifecycle events, (b)
  heartbeat + TTL event-table
- The gate decision determines which approach Task 20 (usePresence) implements:
  - IF lifecycle events work reliably (disconnect fires within 5s): → Use
    lifecycle-based presence (simpler)
  - IF lifecycle events are unreliable but event-table TTL works: → Use heartbeat + TTL
    pattern
  - IF neither works well: → Use heartbeat + manual cleanup reducer (most complex, least
    elegant)
- Task 20’s implementation instructions MUST be updated to match the gate decision

**Gate 12: Subscription Access Control / Read-Side ACL**
[NEW — CRITICAL for multi-tenant security]
- This is the **primary architecture fork** — if read-side ACL fails, the entire
  multi-tenant security model downgrades.
- IF SpacetimeDB supports private tables + identity-filtered views for subscriptions
  (Spike Item 20): → Use view-based reads for org-scoped data: clients subscribe to
  views that enforce identity/org filtering server-side → Update Tasks 7-9, 13c (CRUD
  factories) to generate views for read paths, not direct table subscriptions → orgCrud
  (Task 8) is secure for both reads and writes
- IF SpacetimeDB supports procedures-only reads (no direct table subscription for
  sensitive data): → Use procedures for all org-scoped reads.
  More complex but secure.
  → Modify Task 14-16 (hooks): use procedure calls instead of subscriptions for org data
  → Real-time updates: subscribe to a notification table, fetch fresh data via procedure
  on notification
- IF NO server-side read enforcement exists: → orgCrud ACL enforces WRITES ONLY (reducer
  permission checks). READS are uncontrolled.
  → Document as FIRST-CLASS limitation in Task 34 (docs): “Client-side WHERE is not
  access control — subscriptions can access any table data.
  OrgCrud enforces write permissions only.”
  → For demo apps: acceptable (trusted environment).
  For production: recommend external auth proxy or module-per-org isolation.
  → Modify Task 8 (orgCrud) instructions: explicitly note that read-side ACL is not
  enforced

**Gate 13: Schema Introspection Feasibility** [NEW — affects Task 4 Zod bridge]
- IF `t.*`/`table()` definitions expose stable runtime metadata that can be introspected
  to generate Zod schemas programmatically (Spike Item 18 sub-check): → Task 4’s
  `zodFromTable()` works as planned — introspect t.* definitions at runtime to produce
  Zod

- IF `t.*` builders are opaque / no stable metadata API: → **Simplest fallback
  (preferred)**: Zod schemas stay user-authored alongside t.* tables (parallel
  definitions, no auto-derivation).
  This is the path of least resistance — avoid building a new DSL unless we’re willing
  to own it long-term.
  → Alternative (higher effort): betterspace provides its own thin schema DSL that
  generates BOTH `t.*` tables and Zod schemas from a single definition (like Drizzle’s
  `createTable()`) → Update Task 4 instructions to match the chosen approach → Estimated
  additional effort if DSL route: 2-3 days for DSL design

- [ ] 3. Port branded type system to SpacetimeDB t.* types (CANONICAL SCHEMA SOURCE)

  **What to do**:
  - **Schema Source-of-Truth Architecture**: SpacetimeDB `t.*` table definitions are the
    CANONICAL schema. Everything else derives from them (Drizzle-style).
    The derivation chain is: `t.*` table definitions (Task 3, canonical) → Zod schemas
    (Task 4, derived for client forms) → TypeScript types (inferred from t.*). This
    means Task 3 establishes the schema authority, Task 4 derives from it, and Task 5’s
    schema-helpers bridge the two.
  - Rewrite the branded type system (`SchemaBrand<K>`, `AssertSchema<T>`,
    `SchemaTypeError`) to work with SpacetimeDB’s `t.*` type builders instead of
    Zod/Convex `v.*`
  - Create type-level mapping: `t.string()` → TypeScript `string`, `t.u64()` → `bigint`,
    `t.u32()` → `number`, `t.bool()` → `boolean`, `t.identity()` → `Identity`,
    `t.timestamp()` → `Timestamp`, etc.
  - Preserve compile-time enforcement: typos in field names or wrong types must still
    produce type errors
  - Port the `SchemaDefinition` type and factory type inference so that `crud(schema)`
    infers correct input/output types from SpacetimeDB table definitions
  - Create the `TableSchema<T>` type that extracts TypeScript types from a SpacetimeDB
    table definition
  - Handle SpacetimeDB-specific types: `t.identity()`, `t.timestamp()`, `t.enum()`,
    `t.option()` (nullable), `t.array()`, `t.map()`
  - Ensure autoInc fields are optional on create (SpacetimeDB auto-generates them)
  - Ensure identity fields are auto-populated from `ctx.sender` (not user-provided)
  - **Conflict prevention for Wave 2a parallelism (CRITICAL)**: Instead of a single
    monolithic `types.ts` (614 lines), split into separate type files per factory, each
    exclusively owned by its Wave 2a task:
    - `types/index.ts` — re-exports from all type files (Task 3 owns this)
    - `types/common.ts` — shared base types, inference helpers (Task 3 owns this)
    - `types/crud.ts` — crud factory types (Task 7 owns this exclusively)
    - `types/org-crud.ts` — orgCrud factory types (Task 8 owns this exclusively)
    - `types/child.ts` — childCrud types (Task 9 owns this exclusively)
    - `types/singleton.ts` — singletonCrud types (Task 10 owns this exclusively)
    - `types/cache.ts` — cacheCrud types (Task 11 owns this exclusively)
    - `types/middleware.ts` — middleware types (Task 12 owns this exclusively)
    - This prevents 9 parallel Wave 2a tasks from merge-conflicting on the same file.
      Each factory task creates its own type file and adds its re-export to
      `types/index.ts`.

  **Must NOT do**:
  - Do NOT invent new type features beyond what lazyconvex has
  - Do NOT change the external API surface — consumers should use the same patterns
  - Do NOT put all types in a single file — use the split type structure above to
    prevent Wave 2a merge conflicts

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex TypeScript type-level programming, requires understanding both
      lazyconvex’s branded types and SpacetimeDB’s type system deeply
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not relevant — pure type-level work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 4, 5, 6)
  - **Blocks**: Tasks 7-13 (CRUD factories need the type system)
  - **Blocked By**: Task 2 (spike validates SpacetimeDB type patterns)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/schema.ts` — Current branded type system (SchemaBrand,
    AssertSchema, SchemaTypeError)
  - `packages/betterspace/src/server/crud.ts:1-100` — How CRUD factory uses schema types
    for inference
  - `packages/betterspace/src/server/types.ts` (614 lines) — Core type definitions for
    all factories and contexts

  **API/Type References**:
  - SpacetimeDB `t.*` type builders: `t.string()`, `t.u32()`, `t.u64()`, `t.bool()`,
    `t.identity()`, `t.timestamp()`, `t.enum()`, `t.option()`, `t.array()`, `t.map()`
  - SpacetimeDB `table()` function signature and return type

  **External References**:
  - SpacetimeDB TypeScript Module Reference:
    https://spacetimedb.com/docs/modules/typescript — Type builder API

  **WHY Each Reference Matters**:
  - `schema.ts`: The CORE of lazyconvex’s type safety — branded types that enforce
    correct schema usage at compile time.
    Must be ported 1:1 in concept.
  - `crud.ts` top: Shows how the factory uses `SchemaBrand` to infer create/update input
    types — the port must preserve this inference chain
  - SpacetimeDB docs: Exact `t.*` API to map against

  **Acceptance Criteria**:
  - [ ] `TableSchema<typeof BlogTable>` correctly infers
    `{ id: bigint, title: string, content: string, ... }`
  - [ ] `SchemaBrand<K>` equivalent works with SpacetimeDB table definitions
  - [ ] AutoInc fields are optional in create input types
  - [ ] Identity fields are excluded from user-facing input types
  - [ ] Typo in field name produces compile-time error (not runtime)
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Type system catches typos at compile time
    Tool: Bash
    Preconditions: Type system ported
    Steps:
      1. Create a test file with intentional typo: `schema.titl` instead of `schema.title`
      2. Run `bunx tsc --noEmit test-file.ts`
      3. Verify compiler error mentions "titl" not existing
    Expected Result: TypeScript compiler error on typo
    Failure Indicators: No error, or runtime error instead of compile-time
    Evidence: .sisyphus/evidence/task-3-type-safety.txt

  Scenario: AutoInc and Identity fields handled correctly
    Tool: Bash
    Preconditions: Type system ported
    Steps:
      1. Create a table with `id: t.u64().primaryKey().autoInc()` and `owner: t.identity()`
      2. Verify CreateInput type does NOT require `id` or `owner`
      3. Verify ReadOutput type DOES include `id` and `owner`
      4. Run `bunx tsc --noEmit` on test file
    Expected Result: Create inputs exclude auto-managed fields, outputs include them
    Failure Indicators: Create input requires id/owner, or output misses them
    Evidence: .sisyphus/evidence/task-3-auto-fields.txt
  ```

- [ ] 4. Create Zod ↔ SpacetimeDB t.* bridge for client forms (DERIVED from canonical
  t.* schema)

  **What to do**:
  - **This task derives Zod schemas FROM the canonical t.* table definitions established
    in Task 3.** The t.* table is the single source of truth; Zod schemas are a
    client-side projection for form validation.
    Developers define tables with t.*, and `zodFromTable()` auto-generates the
    corresponding Zod schema — they never manually write both.
  - Create a bridge module that generates Zod schemas from SpacetimeDB table definitions
  - Given a SpacetimeDB table with `t.string()`, `t.u64()`, etc., produce a
    corresponding Zod schema for client-side form validation
  - Map: `t.string()` → `z.string()`, `t.u64()` → `z.bigint()` or `z.number()`,
    `t.bool()` → `z.boolean()`, `t.option(t.string())` → `z.string().optional()`,
    `t.enum(...)` → `z.enum(...)`, `t.array(t.string())` → `z.array(z.string())`
  - Handle edge cases: autoInc fields excluded from form schemas, identity fields
    excluded, timestamps auto-generated
  - The bridge should be used by `useForm` / form components for validation
  - Export a `zodFromTable(tableDefinition)` utility function

  **Must NOT do**:
  - Do NOT make Zod a server-side dependency — it’s client-only
  - Do NOT change form validation behavior — same UX as lazyconvex

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Type-level bridge between two schema systems.
      Requires understanding both Zod and SpacetimeDB type representations.
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Not relevant — schema bridge, not UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 5, 6)
  - **Blocks**: Tasks 17, 21 (form hooks and components need the Zod bridge)
  - **Blocked By**: Task 2 (spike validates type mapping)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/form.ts` — Current form system using Zod schemas
    derived from Convex validators
  - `packages/betterspace/src/schema.ts` — How current schemas are defined and how Zod
    is derived

  **API/Type References**:
  - SpacetimeDB `t.*` type builders — source types to convert FROM
  - Zod schema builders — target types to convert TO

  **External References**:
  - Zod docs: https://zod.dev — Schema builder API

  **WHY Each Reference Matters**:
  - `form.ts`: Shows how Zod schemas are currently consumed for form validation — the
    bridge output must be compatible
  - `schema.ts`: Shows the current Convex→Zod derivation pattern — need equivalent for
    SpacetimeDB→Zod

  **Acceptance Criteria**:
  - [ ] `zodFromTable(BlogTable)` produces a valid Zod schema
  - [ ] Zod schema validates correctly: valid data passes, invalid data fails with
    proper error messages
  - [ ] AutoInc and identity fields excluded from form Zod schema
  - [ ] Optional fields (`t.option()`) map to `.optional()` in Zod
  - [ ] Enum fields map correctly
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Zod bridge produces correct validation
    Tool: Bash
    Preconditions: Bridge module created
    Steps:
      1. Create test: `const schema = zodFromTable(BlogTable)`
      2. `schema.parse({ title: "Hello", content: "World" })` — should succeed
      3. `schema.parse({ title: 123 })` — should throw ZodError with "Expected string"
      4. `schema.parse({})` — should throw ZodError for missing required fields
    Expected Result: Correct validation behavior matching lazyconvex forms
    Failure Indicators: Valid data rejected, invalid data accepted, wrong error messages
    Evidence: .sisyphus/evidence/task-4-zod-bridge.txt
  ```

- [ ] 5. Port base CRUD helpers/utilities and ALL shared utility files

  **What to do**:
  - Port `server/helpers.ts` (522 lines) — Database, error, and utility helpers:
    - ID generation: SpacetimeDB uses `autoInc` for primary keys — adapt ID handling
    - Timestamp helpers: `t.timestamp()` replaces Convex’s `Date.now()` pattern — use
      `ctx.timestamp`
    - Soft delete helpers: `_deleted`, `_deletedAt` fields pattern
    - Pagination helpers: Offset-based pagination over subscription data (replaces
      cursor-based)
    - Sort helpers: Client-side sorting over subscribed data
    - Filter helpers: Client-side filtering utilities
    - Input sanitization utilities (trim, normalize, etc.)
  - Port `server/bridge.ts` (10 lines) — Type-safe query/filter/search builder bridges
  - Port `server/env.ts` (4 lines) — Environment detection (test mode flag)
  - Port `server/schema-helpers.ts` (207 lines) — Currently builds Convex
    `defineTable()` from Zod schemas.
    **Rewrite to derive Zod schemas FROM SpacetimeDB `t.*` table definitions**
    (reversing the derivation direction — `t.*` is canonical, Zod is derived).
    This aligns with Task 3’s canonical schema architecture: developers define tables
    with `t.*`, and `schema-helpers.ts` provides utilities to extract TypeScript types
    and Zod schemas from those definitions.
    If `t.*` builders do NOT expose stable runtime metadata for introspection (validated
    in spike), fall back to a parallel-definition approach where betterspace provides a
    thin DSL that generates both `t.*` tables and Zod schemas from a single source.
  - Port `constants.ts` (23 lines) — Shared constants (cookies, timeouts, sleep utility)
  - Port `guard.ts` (28 lines) — Runtime API module name validation.
    Adapt for SpacetimeDB reducer/table names.
  - Port `retry.ts` (50 lines) — Exponential backoff retry utility (generic, mostly copy
    as-is)
  - Port `schema-utils.ts` (153 lines) — Schema parsing and factory endpoint extraction
    (used by CLI)
  - Port `zod.ts` (157 lines) — Zod introspection utilities (unwrapZod, type checks —
    mostly generic)
  - Port `seed.ts` (129 lines) — Fake data generator for schemas (used in testing)
  - Port the `where` clause builder for SpacetimeDB’s `where(eq(...))` API
  - Port the auth context helpers: `ctx.sender` (Identity) replaces
    `ctx.auth.getUserIdentity()`
  - **Explicit `convex-helpers` replacement mapping** (these utilities are deeply
    integrated — use `lsp_find_references` to map all usages before replacing):
    - `zCustomQuery` / `zCustomMutation` → betterspace reducer/procedure wrapper with
      Zod validation (or remove if SpacetimeDB’s `t.*` type system handles validation
      natively — check during spike)
    - `customCtx` → betterspace context extension for middleware composition (may be
      simpler with SpacetimeDB’s `ctx` object)
    - `zid()` → betterspace ID validator for SpacetimeDB auto-inc IDs (`z.number()` for
      u32 or `z.bigint()` for u64)
    - `zodOutputToConvexFields` → REMOVED (replaced by Task 4’s `zodFromTable()` which
      derives Zod FROM t.*, not the other direction)
    - Use `ast_grep_search` with pattern `from 'convex-helpers` across all packages to
      find every import site
  - **Create wire-form serialization utilities** (standardized conversions for URLs,
    JSON, forms, localStorage, React keys — ALL code goes through these, no ad-hoc
    conversions):
    - `idToWire(id: number | bigint): string` — convert ID to string for URLs/JSON/forms
      (trivial `String(id)` for u32, but standardized so code doesn’t bifurcate if a
      table uses u64)
    - `idFromWire(str: string): number | bigint` — parse ID from URL/form string
    - `identityToHex(identity: Identity): string` — convert Identity to hex string for
      storage/URL/JSON/React keys
    - `identityFromHex(hex: string): Identity` — reconstruct Identity from hex string
    - `identityEquals(a: Identity, b: Identity): boolean` — safe comparison (wraps
      `a.isEqual(b)`)
    - `timestampToWire(ts: Timestamp): string` — convert Timestamp to ISO string for
      JSON/forms
    - `timestampFromWire(str: string): Timestamp` — parse Timestamp from ISO string
    - These utilities are used by ALL ownership checks in CRUD factories, auth helpers,
      React hooks, form components, and URL params
  - Update `index.ts` (61 lines) — Main barrel exports to reflect new module structure

  **Must NOT do**:
  - Do NOT implement cursor-based pagination — SpacetimeDB uses subscriptions
  - Do NOT add new utility functions beyond what exists (Identity utilities are a
    REPLACEMENT for Convex’s string-based identity pattern, not an addition)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 11 files totaling ~1,344 lines — individually simple but collectively
      significant. Schema-helpers rewrite is non-trivial.
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4, 6)
  - **Blocks**: Tasks 7-13 (CRUD factories use these utilities), Task 30 (CLI uses
    schema-utils)
  - **Blocked By**: Task 2 (spike validates SpacetimeDB API patterns)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/helpers.ts` (522 lines) — Core utility functions
  - `packages/betterspace/src/server/bridge.ts` (10 lines) — Type bridges
  - `packages/betterspace/src/server/env.ts` (4 lines) — Environment detection
  - `packages/betterspace/src/server/schema-helpers.ts` (207 lines) — Schema → table
    definition builders
  - `packages/betterspace/src/constants.ts` (23 lines) — Shared constants
  - `packages/betterspace/src/guard.ts` (28 lines) — API name validation
  - `packages/betterspace/src/retry.ts` (50 lines) — Retry utility
  - `packages/betterspace/src/schema-utils.ts` (153 lines) — Schema parsing for CLI
  - `packages/betterspace/src/zod.ts` (157 lines) — Zod introspection
  - `packages/betterspace/src/seed.ts` (129 lines) — Fake data generator
  - `packages/betterspace/src/index.ts` (61 lines) — Barrel exports

  **WHY Each Reference Matters**:
  - `helpers.ts`: Core functions used by ALL CRUD factories — most critical port in this
    task
  - `schema-helpers.ts`: Convex-specific table definition builder — needs full rewrite
    for SpacetimeDB
  - `zod.ts`, `schema-utils.ts`: Used by forms and CLI — mostly generic but some
    Convex-specific parts
  - `seed.ts`: Test data generation — needed before test porting

  **Acceptance Criteria**:
  - [ ] All 11 utility files ported and exported
  - [ ] `schema-helpers.ts` builds SpacetimeDB `table()` definitions (not Convex
    `defineTable()`)
  - [ ] Timestamp helpers use SpacetimeDB’s `ctx.timestamp` instead of `Date.now()`
  - [ ] Auth helpers use `ctx.sender` (Identity) instead of Convex auth
  - [ ] Soft delete pattern works with SpacetimeDB table updates
  - [ ] `guard.ts` validates SpacetimeDB reducer/table names
  - [ ] `index.ts` barrel exports updated
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Utility functions work correctly
    Tool: Bash
    Preconditions: Utilities ported
    Steps:
      1. Run `bun test packages/betterspace/src/__tests__/helpers.test.ts` (port relevant tests)
      2. Verify pagination helper correctly slices arrays with offset/limit
      3. Verify sort helper sorts by specified fields
      4. Verify filter helper matches records by field values
      5. Verify seed.ts generates valid fake data for a SpacetimeDB table schema
    Expected Result: All utility tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-5-helpers.txt

  Scenario: Schema helpers build SpacetimeDB tables
    Tool: Bash
    Preconditions: schema-helpers.ts rewritten
    Steps:
      1. Call schema helper with a Zod blog schema
      2. Verify it produces valid SpacetimeDB table() definition with t.* types
      3. Verify autoInc, identity, timestamp fields are correctly mapped
    Expected Result: Schema → SpacetimeDB table definition works
    Failure Indicators: Wrong type mappings, missing fields
    Evidence: .sisyphus/evidence/task-5-schema-helpers.txt
  ```

- [ ] 6. Set up SpacetimeDB dev infrastructure (local instance, scripts, config)

  **What to do**:
  - Add SpacetimeDB dependencies to `packages/betterspace/package.json` and root
    workspace
  - Create `docker-compose.yml` at repo root for local SpacetimeDB + MinIO
    (S3-compatible storage for file uploads):
    ```yaml
    services:
      spacetimedb:
        image: clockworklabs/spacetime:latest
        command: start
        ports:
          - "3000:3000"
          - "5432:5432"   # PGWire port — needed if Gate 7 (SSR) validates PGWire for server-side queries
        volumes:
          - spacetimedb_data:/data
        restart: unless-stopped
        healthcheck:
          test: ["CMD-SHELL", "curl -fsS http://localhost:3000/v1/ping 2>/dev/null || curl -fsS http://localhost:3000/database/ping 2>/dev/null || exit 1"]
          interval: 5s
          timeout: 3s
          retries: 10
          start_period: 10s

      minio:
        image: minio/minio
        command: server /data --console-address ":9001"
        ports:
          - "9000:9000"
          - "9001:9001"
        environment:
          MINIO_ROOT_USER: minioadmin
          MINIO_ROOT_PASSWORD: minioadmin
        volumes:
          - minio_data:/data
        restart: unless-stopped
        healthcheck:
          test: ["CMD-SHELL", "curl -fsS http://localhost:9000/minio/health/live || exit 1"]
          interval: 5s
          timeout: 3s
          retries: 5
          start_period: 5s

    volumes:
      spacetimedb_data:
      minio_data:
    ```
  - Create dev scripts in package.json:
    - `spacetime:up` —
      `docker compose up -d && spacetime server add local --url http://localhost:3000 --no-fingerprint --default 2>/dev/null; echo 'SpacetimeDB ready on http://localhost:3000'`
      (start Docker container, then configure LOCAL HOST CLI to target it —
      `spacetime server add` runs on HOST, NOT inside container, because the SpacetimeDB
      CLI on your machine needs to know where to publish/query)
    - `spacetime:down` — `docker compose down` (stop SpacetimeDB)
    - `spacetime:publish` — Publish module to local instance (wraps `spacetime publish`)
    - `spacetime:generate` — Generate TypeScript bindings (wraps `spacetime generate`)
    - `spacetime:sql` — Run SQL queries against local instance
    - `spacetime:reset` — `docker compose down -v && bun spacetime:up` (nuke data, fresh
      start)
    - `spacetime:logs` — `docker compose logs -f spacetimedb` (tail logs for debugging)
    - `spacetime:health` — Check SpacetimeDB is running and responsive
    - `spacetime:storage` — Create MinIO bucket for file uploads:
      `curl -s http://localhost:9000/minio/health/live > /dev/null && mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb --ignore-existing local/betterspace-uploads && mc anonymous set download local/betterspace-uploads`
      (or equivalent using AWS CLI)
  - Create SpacetimeDB module config file (server module entry point)
  - Set up `spacetime generate` in build pipeline so bindings are always fresh
  - Update `tsconfig.json` for SpacetimeDB module compilation settings
  - Create `.env.example` with SpacetimeDB connection details:
    - Local (Docker): `SPACETIMEDB_URI=http://localhost:3000`
    - Maincloud: `SPACETIMEDB_URI=https://<name>.spacetimedb.com`
    - Self-hosted: `SPACETIMEDB_URI=https://your-domain.com`
    - S3/MinIO (local): `S3_ENDPOINT=http://localhost:9000`, `S3_ACCESS_KEY=minioadmin`,
      `S3_SECRET_KEY=minioadmin`, `S3_BUCKET=betterspace-uploads`, `S3_REGION=us-east-1`
    - S3/R2 (production): `S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`,
      `S3_ACCESS_KEY=<key>`, `S3_SECRET_KEY=<secret>`, `S3_BUCKET=betterspace-uploads`,
      `S3_REGION=auto`
  - Create `.env.test` (gitignored) template for test runs — sets
    `SPACETIMEDB_URI=http://localhost:3000` and `SPACETIMEDB_TEST_MODE=true`
  - **Configure SpacetimeAuth with Google OAuth** (walking skeleton prerequisite — user
    confirmed they have existing Google Cloud OAuth credentials):
    - Add `SPACETIMEAUTH_PROJECT_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` to
      `.env.example` with placeholder values
    - Add actual credentials to `.env` (gitignored) — user provides these
    - Verify OAuth redirect works against local Docker SpacetimeDB
    - Without this, the walking skeleton gate (which requires real Google OAuth flow)
      will fail
  - Verify infra supports the full demo app workflow:
    - SpacetimeDB accepts WebSocket connections from Next.js apps (port 3000)
    - SpacetimeDB accepts `spacetime publish` for module deployment
    - SpacetimeDB accepts `spacetime sql` for data verification
    - Multiple demo apps can connect to the SAME SpacetimeDB instance simultaneously
      (different databases/modules)
  - Update monorepo workspace config to include SpacetimeDB module directories
  - Ensure `bun fix` still works with new dependencies

  **Must NOT do**:
  - Do NOT set up production/Maincloud deployment yet — just local dev via Docker
    (Maincloud testing is a later step after all tasks pass)
  - Do NOT remove Convex dev config — keep for reference

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Config file creation, package.json edits, script setup — mechanical work
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None relevant

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3, 4, 5)
  - **Blocks**: Tasks 7-13 (CRUD factories need dev environment), Tasks 24-28 (demo apps
    need dev scripts)
  - **Blocked By**: Task 2 (spike validates which dependencies and configs are needed)

  **References**:

  **Pattern References**:
  - `packages/betterspace/package.json` — Current package config to extend
  - Root `package.json` — Workspace scripts
  - `packages/be/convex/` — Current Convex module config (reference pattern)

  **External References**:
  - SpacetimeDB CLI reference:
    https://spacetimedb.com/docs/modules/typescript/quickstart — CLI commands and config

  **WHY Each Reference Matters**:
  - Package.json files: Must add correct SpacetimeDB SDK versions
  - Convex config: Shows the DX pattern (dev scripts, type generation) to replicate for
    SpacetimeDB

  **Acceptance Criteria**:
  - [ ] `docker-compose.yml` exists at repo root with SpacetimeDB service
  - [ ] `bun spacetime:up` starts SpacetimeDB via Docker on port 3000
  - [ ] `bun spacetime:publish` publishes a module successfully
  - [ ] `bun spacetime:generate` generates TypeScript bindings
  - [ ] `bun spacetime:reset` clears and restarts the database
  - [ ] `.env.example` documents all connection options (local/maincloud/self-hosted)
  - [ ] `bun install` succeeds with new dependencies
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Docker-based dev infrastructure works end-to-end
    Tool: Bash
    Preconditions: Docker installed and running, dependencies installed
    Steps:
      1. Run `bun spacetime:up` — should start SpacetimeDB container
      2. Run `docker ps | grep spacetime` — should show running container on port 3000
      3. Run `curl http://localhost:3000/v1/ping` or equivalent health check — should respond
      4. Create minimal module, run `bun spacetime:publish` — should succeed
      5. Run `bun spacetime:generate` — should produce .ts files in expected output directory
      6. Run `bun spacetime:sql "SELECT 1"` — should return result
      7. Run `bun spacetime:reset` — should clear database and restart
      8. Run `bun spacetime:down` — should stop and remove container
    Expected Result: Full Docker-based dev lifecycle works
    Failure Indicators: Container fails to start, publish fails, bindings not generated
    Evidence: .sisyphus/evidence/task-6-dev-infra.txt

  Scenario: .env.example covers all deployment targets
    Tool: Bash
    Preconditions: .env.example exists
    Steps:
      1. Read `.env.example` — should contain SPACETIMEDB_URI with examples for local, maincloud, self-hosted
      2. Verify no CONVEX_ env vars remain
    Expected Result: Clear configuration for all 3 deployment targets
    Failure Indicators: Missing deployment target, stale Convex vars
    Evidence: .sisyphus/evidence/task-6-env-check.txt
  ```

- [ ] 7. Port crud() factory to SpacetimeDB reducers + views

  **What to do**:
  - Rewrite the core `crud()` factory to generate SpacetimeDB reducers instead of Convex
    mutations/queries
  - **Module composition pattern**: Factory output must be compatible with SpacetimeDB’s
    `schema({}) → spacetimedb.reducer()` pattern.
    The factory likely returns table config + reducer factory functions (NOT standalone
    reducers). `setup.ts` (Task 13b) composes these into a single `schema({})` +
    `export default spacetimedb` module export.
    Spike Item 19 validates the exact composition pattern.
  - **Reducer `await` for error handling**: Use SpacetimeDB 2.0’s `await` pattern —
    `await conn.reducers.create_blog(...)` resolves on success, rejects with
    `SenderError` on failure.
    This is cleaner than fire-and-forget for form submission and optimistic updates.
    Procedures only needed for return values (auto-inc IDs).
  - For each CRUD operation, generate:
    - `create_{table}` **procedure OR reducer** (determined by Spike Item 1 + Gate
      decision): If procedures validated → use procedure with `ctx.withTx()` that
      inserts and returns the new auto-increment ID to the client.
      If procedures have issues → use reducer (fire-and-forget), client discovers new
      row via subscription delta matching on `owner === ctx.sender` + most recent
      `createdAt`. Accepts validated input, uses `ctx.db.{table}.insert()`, auto-sets
      `owner: ctx.sender`, `createdAt: ctx.timestamp`, `updatedAt: ctx.timestamp`.
    - `update_{table}` reducer: Accepts id + partial update, uses
      `ctx.db.{table}.id.find(id)` then `ctx.db.{table}.id.update(merged)`. Validates
      ownership. Sets `updatedAt: ctx.timestamp`. **NOTE**: SpacetimeDB uses
      column-name-based access (`ctx.db.{table}.id`), NOT `.pk` — the column is accessed
      by its name (`id`), not a generic `.pk` accessor.
    - `rm_{table}` reducer: Accepts id, validates ownership, uses
      `ctx.db.{table}.id.delete(id)`. If soft delete enabled: updates
      `_deleted: true, _deletedAt: ctx.timestamp` instead.
    - `bulkCreate_{table}` reducer: Accepts array, iterates with
      `ctx.db.{table}.insert()` in single transaction
    - `bulkUpdate_{table}` reducer: Accepts array of {id, ...updates}, iterates updates
    - `bulkRm_{table}` reducer: Accepts array of ids, iterates deletes
  - For queries, configure client-side subscriptions:
    - `list` → `useTable('{table}', where(...))` — all matching rows via subscription
    - `read` → `useTable('{table}', where(eq('id', id)))` — single row via subscription
  - Preserve factory options: `softDelete`, `timestamps`, `ownership`, `pub` (public
    read-only endpoints)
  - Port the `pub` option: generates reducers/views without ownership checks
  - Handle “no return value” pattern: document that creates are read from subscription,
    not returned
  - **File lifecycle management** (deeply embedded in crud.ts — NOT just a Task 13
    concern):
    - Port `detectFiles(schema.shape)` — detects which fields contain file references
    - Port `addUrls()` — enriches query results with file download URLs (presigned R2/S3
      URLs)
    - Port `cleanFiles()` — when a document is deleted, auto-deletes associated files
      from R2/S3 via procedure
    - This means the crud factory DEPENDS on the file upload system (Task 13) for these
      features — coordinate via shared file utility module
  - **Rate limiting**: Port `checkRateLimit` — per-user rate limiting via SpacetimeDB
    table tracking request counts per Identity (or use SpacetimeDB’s built-in rate
    limiting if spike validates one exists)
  - **Hook context shape mapping**: Convex `{ db, storage, userId }` → SpacetimeDB
    `{ db, sender, timestamp }`. No `storage` in SpacetimeDB ctx — file operations go
    through external R2/S3 utilities.
    `userId` becomes `ctx.sender` (Identity class, NOT string).
  - **Enrichment**: Port author info enrichment (JOIN with users table via view or
    manual lookup)
  - **Conflict detection**: Port `expectedUpdatedAt` pattern for optimistic concurrency
    — SpacetimeDB reducers are ACID but concurrent updates can still have lost-update
    problems

  **Must NOT do**:
  - Do NOT add new CRUD operations beyond what lazyconvex defines
  - Do NOT implement pagination in the factory — that’s handled by hooks (Task 14)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core factory pattern — complex type inference, multiple code paths (soft
      delete, ownership, pub), careful API design
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Server-side only

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 8-13)
  - **Blocks**: Tasks 14-22 (React hooks/components need CRUD factories)
  - **Blocked By**: Tasks 3, 5 (type system and helpers)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/crud.ts` — ENTIRE FILE — The core factory to port.
    Read thoroughly before starting.
  - `packages/betterspace/src/server/helpers.ts` — Shared helpers used by crud factory

  **API/Type References**:
  - `packages/betterspace/src/schema.ts` — Schema types the factory consumes
  - `packages/betterspace/src/server/types.ts` (614 lines) — Return types and inference
    helpers

  **External References**:
  - SpacetimeDB reducer API: https://spacetimedb.com/docs/modules/typescript —
    `spacetimedb.reducer()` signature
  - SpacetimeDB table operations: `ctx.db.{table}.insert()`, `ctx.db.{table}.id.find()`,
    `ctx.db.{table}.id.update()`, `ctx.db.{table}.id.delete()` — **column-name-based
    access**, NOT `.pk`

  **WHY Each Reference Matters**:
  - `crud.ts`: THE file being ported — every line matters.
    Understand options, code paths, type inference
  - SpacetimeDB docs: Target API for generated reducers

  **Acceptance Criteria**:
  - [ ] `crud(schema)` generates create, update, rm, bulkCreate, bulkUpdate, bulkRm
    reducers
  - [ ] Ownership checking works (only owner can update/delete their rows)
  - [ ] Soft delete option works (sets _deleted flag instead of removing)
  - [ ] Timestamps auto-managed (createdAt, updatedAt)
  - [ ] Pub option generates public read-only access
  - [ ] Type inference: create input excludes autoInc/identity fields
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Full CRUD lifecycle via factory-generated reducers
    Tool: Bash
    Preconditions: SpacetimeDB running, module with crud()-generated table published
    Steps:
      1. Call create reducer — verify row appears in `spacetime sql` query
      2. Call update reducer with owner identity — verify field changed
      3. Call update reducer with DIFFERENT identity — verify rejected (ownership)
      4. Call rm reducer — verify row deleted (or soft-deleted if enabled)
      5. Call bulkCreate with 5 items — verify all 5 exist
      6. Call bulkRm with those 5 IDs — verify all gone
    Expected Result: All CRUD operations work with correct ownership enforcement
    Failure Indicators: Wrong owner can modify, soft delete doesn't flag, bulk ops partial
    Evidence: .sisyphus/evidence/task-7-crud-factory.txt

  Scenario: Soft delete preserves data
    Tool: Bash
    Preconditions: Table with softDelete: true
    Steps:
      1. Create a row
      2. Call rm reducer — verify row still exists with `_deleted: true`
      3. Query with `WHERE _deleted = false` — should NOT find the row
      4. Query with `WHERE _deleted = true` — SHOULD find the row
    Expected Result: Row preserved with deletion flag
    Failure Indicators: Row actually deleted, or _deleted not set
    Evidence: .sisyphus/evidence/task-7-soft-delete.txt
  ```

- [ ] 8. Port orgCrud() factory with ACL

  **What to do**:
  - Rewrite `orgCrud()` to generate SpacetimeDB reducers with organization-scoped access
    control
  - Each record belongs to an org (via `orgId` field) — CRUD operations scoped to user’s
    org membership
  - Port ACL system: owner/admin/editor/viewer roles determine who can
    create/update/delete
  - Generate reducers:
    - `create_{table}` — validates user is member of specified org with create
      permission
    - `update_{table}` — validates user has edit permission for this org’s data
    - `rm_{table}` — validates user has delete permission
    - ACL management: `addEditor`, `removeEditor`, `setEditors`, `editors` (list
      editors)
  - Port the permission checking logic using SpacetimeDB’s `ctx.sender` (Identity)
  - Create org membership lookup: query org_members table to verify membership + role

  **Must NOT do**:
  - Do NOT add new permission levels beyond what lazyconvex defines
  - Do NOT implement org management here — that’s the org system (Task 23’s dependency)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: ACL logic is security-critical — must correctly port permission checks.
      Complex multi-table queries.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 9-13)
  - **Blocks**: Tasks 23, 28 (org hooks and org demo app)
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/org-crud.ts` — ENTIRE FILE — The org CRUD factory
    to port
  - `packages/betterspace/src/server/org-members.ts` — Member management and role
    checking
  - `packages/betterspace/src/server/org-invites.ts` — Invite system
  - `packages/betterspace/src/server/org-join.ts` — Join request system

  **WHY Each Reference Matters**:
  - `org-crud.ts`: Core factory being ported — ACL logic, permission checks, role-based
    access
  - `org-members.ts`: How membership is verified — must replicate with SpacetimeDB
    tables

  **Acceptance Criteria**:
  - [ ] `orgCrud(schema)` generates org-scoped CRUD reducers
  - [ ] Permission checking works: viewer can read, editor can edit, admin can manage
  - [ ] Non-member cannot access org data
  - [ ] ACL management reducers (addEditor, etc.)
    work correctly
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: ACL enforcement
    Tool: Bash
    Preconditions: Org with admin (Alice) and viewer (Bob) created
    Steps:
      1. As Alice (admin): create a record in org — should succeed
      2. As Bob (viewer): try to update that record — should be rejected
      3. As Alice: addEditor for Bob
      4. As Bob (now editor): update the record — should succeed
      5. As unknown user: try to read org data — should be rejected
    Expected Result: Role-based access enforced correctly
    Failure Indicators: Viewer can edit, non-member can access
    Evidence: .sisyphus/evidence/task-8-acl.txt
  ```

- [ ] 9. Port childCrud() factory (parent-child relationships)

  **What to do**:
  - Rewrite `childCrud()` to generate SpacetimeDB reducers for parent-child table
    relationships
  - Child records reference a parent via `parentId` field
  - CRUD operations scoped: can only access children of a specific parent
  - Generate reducers:
    - `create_{child}` — requires parentId, validates parent exists
    - `update_{child}` — validates child belongs to specified parent
    - `rm_{child}` — validates ownership/parent relationship
    - `list_{children}` — query children by parentId (via subscription filter)
  - Port cascade behavior: when parent is deleted, handle children (cascade delete or
    orphan)
  - Port the `pub` option for public read-only access to children

  **Must NOT do**:
  - Do NOT add nested child support (grandchildren) — not in lazyconvex

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Relational integrity logic, cascade behavior, parent validation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7, 8, 10-13)
  - **Blocks**: Tasks 24, 26 (backend and chat app use child relationships)
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/child.ts` — ENTIRE FILE — Child CRUD factory to
    port
  - `packages/betterspace/src/server/crud.ts` — Base CRUD pattern (child extends this)

  **WHY Each Reference Matters**:
  - `child.ts`: Direct port target — parent-child relationship logic, cascade behavior
  - `crud.ts`: Base pattern that childCrud builds upon

  **Acceptance Criteria**:
  - [ ] `childCrud(schema, parentTable)` generates parent-scoped CRUD reducers
  - [ ] Child creation requires valid parentId
  - [ ] Children only accessible via parent scope
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Parent-child CRUD lifecycle
    Tool: Bash
    Preconditions: Parent table and child table published
    Steps:
      1. Create a parent record (e.g., BlogPost)
      2. Create a child record (e.g., Comment) with parentId pointing to BlogPost
      3. Query children by parentId — should return 1
      4. Try creating child with non-existent parentId — should fail
      5. Delete parent — verify cascade behavior on children
    Expected Result: Parent-child integrity maintained
    Failure Indicators: Orphaned children, invalid parent accepted
    Evidence: .sisyphus/evidence/task-9-child-crud.txt
  ```

- [ ] 10. Port singletonCrud() factory

  **What to do**:
  - Rewrite `singletonCrud()` for SpacetimeDB — manages single-row tables (settings,
    config)
  - Generate reducers:
    - `get_{table}` — read the single row (or default if none exists)
    - `upsert_{table}` — create if not exists, update if exists
  - Use SpacetimeDB table with a fixed known key (e.g., `id = 0` with autoInc disabled)
  - Port default value handling: if no row exists, return configured defaults

  **Must NOT do**:
  - Do NOT support multiple singletons per table — one table = one singleton

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simplest factory — single row get/upsert.
      Straightforward port.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-9, 11-13)
  - **Blocks**: Task 24 (backend uses singleton)
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/singleton.ts` — ENTIRE FILE — Singleton factory to
    port

  **WHY Each Reference Matters**:
  - `singleton.ts`: Simple factory — understand get/upsert logic and default handling

  **Acceptance Criteria**:
  - [ ] `singletonCrud(schema)` generates get and upsert reducers
  - [ ] First get returns default values
  - [ ] Upsert creates on first call, updates on subsequent calls
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Singleton get/upsert
    Tool: Bash
    Preconditions: Module with singleton table published
    Steps:
      1. Call get reducer — should return default values
      2. Call upsert with custom values
      3. Call get again — should return custom values
      4. Call upsert with partial update
      5. Call get — should show merged values
    Expected Result: Single-row upsert pattern works
    Failure Indicators: Multiple rows created, defaults not applied
    Evidence: .sisyphus/evidence/task-10-singleton.txt
  ```

- [ ] 11. Port cacheCrud() factory (adapt to subscription model)

  **What to do**:
  - Evaluate whether `cacheCrud()` is still needed given SpacetimeDB’s subscription
    model:
    - SpacetimeDB subscriptions automatically client-cache all subscribed data
    - If `cacheCrud` only caches raw table reads → may be unnecessary (thin wrapper)
    - If `cacheCrud` caches computed/aggregated results or external API data → still
      needed
  - Based on spike findings (Task 2), implement the appropriate pattern:
    - If simplified: Create a thin wrapper that just stores external API results in a
      SpacetimeDB table with TTL-based invalidation
    - If full port: Replicate cache invalidation, purge, refresh, load patterns
  - Generate reducers:
    - `load_{cache}` — fetch external data via procedure, store in cache table
    - `get_{cache}` — read from cache table (via subscription)
    - `invalidate_{cache}` — mark cache entries as stale
    - `purge_{cache}` — remove cache entries
    - `refresh_{cache}` — re-fetch and update cache
  - Port TTL-based expiration — **method determined by Spike Item 14 + Gate 8**: if
    scheduled reducers work, use server-side TTL. If not, use client-side expiration or
    manual-invalidate-only.
  - **Two-phase pattern (MANDATORY for cache load/refresh procedures)**: Procedures that
    fetch external APIs and store results must: (1) `ctx.http.fetch()` FIRST
    (synchronous, outside transaction), (2) `ctx.withTx()` to write cache entry to DB.
    Cannot do HTTP inside transaction — this is a hard SpacetimeDB constraint.

  **Must NOT do**:
  - Do NOT over-engineer the caching layer — if subscriptions make it unnecessary,
    simplify

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Requires evaluating architectural fit, possibly redesigning the caching
      pattern for SpacetimeDB’s subscription model
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-10, 12-13)
  - **Blocks**: Tasks 24, 27 (backend and movie app use cache)
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/cache-crud.ts` — ENTIRE FILE — Cache factory to
    port/adapt
  - `apps/movie/` — Primary consumer of cacheCrud (caches TMDB API responses)

  **WHY Each Reference Matters**:
  - `cache-crud.ts`: Understand what’s cached and why — raw data vs computed results vs
    external API
  - Movie app: Shows the real use case — TMDB API results cached server-side

  **Acceptance Criteria**:
  - [ ] Cache factory generates appropriate reducers
  - [ ] External API data (TMDB) can be cached in SpacetimeDB table via procedure
  - [ ] TTL-based invalidation works (via scheduled reducers if Gate 8 confirms, or
    client-side expiration fallback)
  - [ ] Cache refresh fetches fresh data
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Cache load and read
    Tool: Bash
    Preconditions: Module with cache table published
    Steps:
      1. Call load_cache reducer (fetches from external API via procedure)
      2. Query cache table — should have data
      3. Wait for TTL expiration
      4. Verify cache entry marked stale or removed
      5. Call refresh — should fetch fresh data
    Expected Result: Cache lifecycle works with TTL
    Failure Indicators: Cache never expires, refresh fails, stale data served
    Evidence: .sisyphus/evidence/task-11-cache.txt
  ```

- [ ] 12. Port middleware system (auditLog, slowQueryWarn, inputSanitize,
  composeMiddleware)

  **What to do**:
  - Port the middleware composition pattern to work with SpacetimeDB reducer wrappers
  - In Convex, middleware wraps query/mutation functions.
    In SpacetimeDB, wrap reducer handlers.
  - Port each middleware:
    - `auditLog`: Log reducer calls with caller identity, timestamp, args — write to
      audit table or console
    - `slowQueryWarn`: Measure reducer execution time, warn if exceeds threshold
    - `inputSanitize`: Trim strings, normalize inputs before processing
    - `composeMiddleware`: Compose multiple middleware functions into a single wrapper
  - Design the wrapper pattern:
    `withMiddleware(middleware[], reducerHandler) → wrappedHandler`
  - Ensure middleware has access to `ctx` (sender, timestamp, db)

  **Must NOT do**:
  - Do NOT add new middleware types — only port the 3 existing ones + composer
  - Do NOT change middleware API surface

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Middleware composition pattern needs careful design for SpacetimeDB’s
      reducer model
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-11, 13)
  - **Blocks**: Task 24 (backend uses middleware)
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/middleware.ts` — Current middleware implementations
  - `packages/betterspace/src/server/crud.ts` — How middleware is applied to CRUD
    operations

  **WHY Each Reference Matters**:
  - `middleware.ts`: Direct port target — understand each middleware’s logic and the
    composition pattern
  - `crud.ts`: Shows how middleware integrates with factories — need same integration
    point in SpacetimeDB

  **Acceptance Criteria**:
  - [ ] `composeMiddleware([auditLog, inputSanitize])` produces a valid reducer wrapper
  - [ ] `auditLog` records caller identity and reducer name
  - [ ] `slowQueryWarn` logs warning when reducer exceeds threshold
  - [ ] `inputSanitize` trims/normalizes string inputs
  - [ ] Middleware can be applied to any reducer handler
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Middleware composition
    Tool: Bash
    Preconditions: Module with middleware-wrapped reducers published
    Steps:
      1. Call a reducer with leading/trailing whitespace in string input
      2. Verify inputSanitize trimmed the input (check DB value)
      3. Check audit log for the call record (identity, timestamp, reducer name)
      4. Call a slow reducer (add artificial delay in test)
      5. Check logs for slowQueryWarn message
    Expected Result: All middleware functions execute in correct order
    Failure Indicators: Input not sanitized, no audit record, no slow warning
    Evidence: .sisyphus/evidence/task-12-middleware.txt
  ```

- [ ] 13. Port file upload system (procedures + R2/S3)

  **What to do**:
  - Replace Convex’s built-in `_storage` with an external file storage solution using
    SpacetimeDB procedures
  - Create a procedure that generates signed upload URLs (presigned S3/R2 PUT URLs)
  - Create a procedure that generates signed download URLs (presigned GET URLs)
  - **Two-phase pattern (MANDATORY for procedures with HTTP+DB)**: `ctx.http.fetch()` is
    SYNCHRONOUS and CANNOT run inside `ctx.withTx()`. File registration procedure must:
    (1) generate presigned URL via `ctx.http.fetch()` FIRST (outside transaction), (2)
    then `ctx.withTx()` to write file metadata to DB. This two-phase pattern applies to
    ALL procedures that combine HTTP and DB writes.
  - Create a `files` table in SpacetimeDB to track uploaded files (id, filename,
    contentType, size, storageKey, owner, uploadedAt)
  - Create reducers:
    - `register_upload` — After client uploads to R2/S3, register the file in the files
      table
    - `delete_file` — Remove file record and optionally delete from R2/S3 via procedure
  - Port the file metadata handling: content type, file size, original filename
  - Support upload progress tracking (client-side via XHR/fetch progress events)
  - Create S3-compatible configuration: bucket, region, endpoint (R2 uses S3-compatible
    API)

  **Must NOT do**:
  - Do NOT implement a specific cloud provider SDK — use S3-compatible API (works with
    R2, MinIO, AWS S3)
  - Do NOT add image processing/transformation — not in lazyconvex
  - **V8 RUNTIME CONSTRAINT**: SpacetimeDB TypeScript modules run on V8, NOT Node.js —
    there is NO `crypto`, `fs`, `Buffer`. The S3 SDK may NOT work inside procedures for
    pre-signed URL generation.
    The spike (Item 4) will determine whether server-side signing works.
    If not, use the fallback determined by the spike (client-side signing, external
    signing endpoint, etc.). Do NOT assume Node.js APIs are available.

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New subsystem (not a direct port) — S3 presigned URL generation via
      procedures is new architecture
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 7-12)
  - **Blocks**: Task 19 (useUpload hook), Task 25 (blog app uses file upload)
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/file.ts` — Current Convex file storage
    implementation
  - `packages/betterspace/src/react/use-upload.ts` — Client-side upload hook (will
    consume this system)

  **External References**:
  - S3 presigned URL API — `PutObject` presigned URL generation
  - Cloudflare R2 S3-compatible API docs

  **WHY Each Reference Matters**:
  - `file.ts`: Understand current file handling — what metadata is tracked, what
    operations exist
  - `use-upload.ts`: Understand client expectations — what the hook expects from the
    server

  **Acceptance Criteria**:
  - [ ] Procedure generates valid presigned upload URL
  - [ ] Client can upload file to presigned URL (XHR with progress)
  - [ ] After upload, file registered in SpacetimeDB files table
  - [ ] Download URL generation works
  - [ ] File deletion removes record (and optionally S3 object)
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: File upload lifecycle
    Tool: Bash
    Preconditions: Module published, S3-compatible storage configured (MinIO for local dev)
    Steps:
      1. Call get_upload_url procedure — should return presigned PUT URL
      2. Upload a test file to that URL via curl: `curl -X PUT -T test.txt "$PRESIGNED_URL"`
      3. Call register_upload reducer with file metadata
      4. Query files table — should have 1 record with correct metadata
      5. Call get_download_url procedure — should return presigned GET URL
      6. Download via curl — should get the original file
      7. Call delete_file reducer — file record removed
    Expected Result: Full upload → register → download → delete lifecycle
    Failure Indicators: Presigned URL invalid, upload fails, file not registered
    Evidence: .sisyphus/evidence/task-13-file-upload.txt
  ```

- [ ] 13b. Port setup.ts — main entry point composing all factories

  **What to do**:
  - Port `server/setup.ts` (327 lines) — THE main entry point consumers call to
    initialize betterspace
  - This function composes all factories (crud, orgCrud, childCrud, cacheCrud,
    singletonCrud), presence, file upload, and middleware into a single `setup()` call
  - Consumers call `setup({ schema, tables, middleware, org, files, presence })` and get
    back all configured endpoints
  - Rewrite to compose SpacetimeDB reducers, views, and procedures instead of Convex
    queries/mutations/actions
  - Port `server/types.ts` (614 lines) — All TypeScript type definitions for factory
    contexts, options, return types.
    Ensure these align with the new SpacetimeDB-based factories.
  - Update `server/index.ts` (37 lines) — Server barrel exports to reflect all new
    modules
  - Ensure the `setup()` return type provides correct inference for all generated
    reducers/views

  **Must NOT do**:
  - Do NOT change the consumer-facing API shape — same `setup()` call pattern
  - Do NOT add new configuration options

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Integration point for the ENTIRE library — must correctly compose all
      factories. Type inference is complex.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 — Sequential AFTER Tasks 7-13 (needs all factories to
    exist before composing them)
  - **Blocks**: Task 24 (backend consumer calls setup()), Tasks 25-28 (demo apps use
    setup())
  - **Blocked By**: Tasks 7-13 (all CRUD factories, middleware, file upload)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/setup.ts` (327 lines) — ENTIRE FILE — The
    composition entry point
  - `packages/betterspace/src/server/types.ts` (614 lines) — All type definitions

  **WHY Each Reference Matters**:
  - `setup.ts`: This is how consumers USE the library.
    Without porting this, all the individual factories are unusable.
  - `types.ts`: The type system that connects setup() inputs to factory outputs — must
    provide correct inference.

  **Acceptance Criteria**:
  - [ ] `setup({ schema, tables })` returns typed object with all configured endpoints
  - [ ] All factory outputs accessible from setup() return value
  - [ ] Type inference works: `const api = setup(config); api.blog.create(...)` is fully
    typed
  - [ ] Middleware composition applied globally via setup()
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Setup composes all factories
    Tool: Bash
    Preconditions: All factories ported
    Steps:
      1. Create a module using setup() with 3 tables (blog, chat, movie)
      2. Publish module — should succeed
      3. Verify all expected reducers exist (create_blog, update_blog, etc. for each table)
      4. Call reducers via spacetime CLI — should work
    Expected Result: Single setup() call produces all expected endpoints
    Failure Indicators: Missing reducers, publish fails, type errors
    Evidence: .sisyphus/evidence/task-13b-setup.txt
  ```

- [ ] 13c. Port org.ts — organization management factory (separate from orgCrud)

  **What to do**:
  - Port `server/org.ts` (304 lines) — Organization MANAGEMENT factory
  - This is SEPARATE from `org-crud.ts` (Task 8). `org.ts` handles org lifecycle: create
    org, update org, delete org (with cascading deletes), org settings, slug management
  - `org-crud.ts` handles ACL-scoped data CRUD WITHIN an org
  - Port org management functions:
    - `create` — Create new organization
    - `update` — Update org name, slug, settings
    - `get` / `getBySlug` — Read org details
    - `remove` — Delete org with cascading deletes (remove all org data, members,
      invites)
    - `myOrgs` — List user’s organizations
    - `isSlugAvailable` — Check slug uniqueness
  - Port cascading delete logic: when org is removed, delete all related tables’ data

  **Must NOT do**:
  - Do NOT add org billing, quotas, or new features
  - Do NOT merge with org-crud.ts — keep as separate concern

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Cascading deletes across multiple tables are complex and must be correct.
      Security-critical.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (can run parallel with Tasks 7-13 since it depends on
    same prerequisites)
  - **Blocks**: Tasks 23, 28 (org hooks and org demo app)
  - **Blocked By**: Tasks 3, 5

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/org.ts` (304 lines) — ENTIRE FILE — Org management
    factory
  - `packages/betterspace/src/server/org-crud.ts` — Related but separate (ACL-scoped
    data CRUD)

  **WHY Each Reference Matters**:
  - `org.ts`: Direct port target — org lifecycle management, cascading deletes.
    SEPARATE from org-crud.ts.

  **Acceptance Criteria**:
  - [ ] Create org, update org, delete org work
  - [ ] Cascading delete removes all related data when org is deleted
  - [ ] Slug uniqueness check works
  - [ ] `myOrgs` returns correct list for a user
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Org lifecycle with cascading delete
    Tool: Bash
    Preconditions: Module published
    Steps:
      1. Create org "Test Corp" with slug "test-corp"
      2. Add 2 members, create 3 data records within org
      3. Verify isSlugAvailable("test-corp") returns false
      4. Delete org
      5. Verify all members removed, all data records removed
      6. Verify isSlugAvailable("test-corp") returns true
    Expected Result: Clean cascading delete
    Failure Indicators: Orphaned data, slug still taken
    Evidence: .sisyphus/evidence/task-13c-org.txt
  ```

- [ ] 13d. Build test infrastructure from scratch for SpacetimeDB (replaces test.ts +
  test-discover.ts)

  **What to do**:
  - Build NEW test helpers adapted to SpacetimeDB’s testing model (real local DB, not
    mocks like convex-test)
  - DO NOT port test.ts (859 lines) line-by-line — the Convex mock-based approach
    doesn’t apply
  - Create `createTestContext()` that connects to local Docker SpacetimeDB instance
  - Create test auth helpers that generate test Identities — **method determined by
    Spike Item 12 + Gate 6** (anonymous connect, admin API, mock auth, or SpacetimeAuth
    test mode)
  - Create test data seeding helpers (insert rows directly via reducers/procedures)
  - Create org membership helpers for tests (if org system is in scope)
  - Create module discovery that finds published SpacetimeDB modules on local instance
  - **Design test isolation strategy**: Between test runs, state must be clean.
    Options (choose based on performance):
    - Per-test module republish (cleanest but slowest — measure overhead)
    - Per-test `resetDatabase()` reducer that truncates all tables (fast if SpacetimeDB
      supports bulk delete)
    - Per-suite module republish + per-test row cleanup (balanced)
    - Measure: time per reset method.
      If per-test republish >2s, use row cleanup instead.
  - Use lazyconvex’s `test.ts` as REFERENCE for what capabilities are needed, not as a
    template to copy
  - These are PREREQUISITES for Tasks 31-33 (porting all test suites)
  - **TEST SMOKE GATE (MANDATORY)**: After building the test infrastructure, port a
    SMALL representative subset of tests (~20-30 from pure.test.ts) covering: basic
    CRUD, auth/ownership, soft delete, validation errors.
    Run them. Measure:
    - Time per test (target: <500ms average)
    - Total time for 30 tests (target: <30s)
    - Flakiness: run 3 times, all must pass
    - If tests are too slow (>2s each) or flaky: STOP and redesign isolation strategy
      before porting 923+ tests
    - **Performance fallback if real-DB tests are too slow**: (a) batch module publish
      per test suite (not per test), (b) create parallel test modules (each test file
      gets its own module), (c) build a lightweight mock layer for unit tests that don’t
      need real DB, (d) split tests into “fast” (mock) and “integration” (real DB) tiers
    - This gate prevents discovering “real DB tests are 10x slower” after porting 900+
      tests

  **Must NOT do**:
  - Do NOT copy test.ts structure — SpacetimeDB’s model is fundamentally different (real
    DB vs mocks)
  - Do NOT add new test utilities beyond what exists in lazyconvex

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Test infrastructure must work before any tests can be ported.
      859 lines of test helpers is significant.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (can run parallel with factories)
  - **Blocks**: Tasks 31-33 (ALL test porting tasks depend on test infrastructure)
  - **Blocked By**: Tasks 3, 5, 6 (needs type system, helpers, dev infra)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/server/test.ts` (859 lines) — Test helpers to port
  - `packages/betterspace/src/server/test-discover.ts` (37 lines) — Module discovery

  **WHY Each Reference Matters**:
  - `test.ts`: ALL backend/library tests depend on these helpers.
    Must be ported before any test file.
  - `test-discover.ts`: convex-test equivalent for SpacetimeDB — needed for module
    loading in tests.

  **Acceptance Criteria**:
  - [ ] `createTestContext()` works with local SpacetimeDB instance
  - [ ] Test auth bypass allows running tests without real OAuth
  - [ ] Test user creation generates valid SpacetimeDB identities
  - [ ] Module discovery finds published SpacetimeDB modules
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Test context creation
    Tool: Bash
    Preconditions: SpacetimeDB running, module published
    Steps:
      1. Create test context with 2 test users
      2. Verify each user has valid SpacetimeDB identity
      3. Call a reducer as each user — verify identity is correct
      4. Clean up test data
    Expected Result: Test infrastructure supports multi-user testing
    Failure Indicators: Identity creation fails, auth bypass not working
    Evidence: .sisyphus/evidence/task-13d-test-infra.txt
  ```

- [ ] 14. Port useList hook (client-side pagination over subscriptions)

  **What to do**:
  - Rewrite `useList` to work with SpacetimeDB’s subscription model instead of Convex’s
    paginated queries
  - SpacetimeDB subscriptions give ALL matching rows at once (no server cursors)
  - Implement client-side pagination: subscribe to all data, paginate in memory
  - Preserve the API surface: `useList(table, { where, sort, page, pageSize })` returns
    `{ data, totalCount, hasMore, loadMore }`
  - Implement `where` filter using SpacetimeDB’s `where(eq('field', value))` for
    subscription
  - Implement client-side sorting over subscribed data
  - Implement page/offset tracking in React state
  - Handle real-time updates: when subscription data changes, recalculate page contents
  - Preserve loading states and error handling

  **Must NOT do**:
  - Do NOT implement server-side pagination — SpacetimeDB uses subscriptions
  - Do NOT add new filter operators beyond what lazyconvex supports

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Core hook — must handle real-time subscription updates, client-side
      pagination, and sort while maintaining the same API surface
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 15-23)
  - **Blocks**: Tasks 25-28 (all demo apps use useList)
  - **Blocked By**: Task 7 (needs CRUD factory for data)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/use-list.ts` — ENTIRE FILE — Hook to port
  - `packages/betterspace/src/react/use-search.ts` — Related pattern for filtering

  **External References**:
  - SpacetimeDB React `useTable` hook:
    https://spacetimedb.com/docs/sdks/typescript/quickstart

  **WHY Each Reference Matters**:
  - `use-list.ts`: Direct port target — understand pagination logic, where clause
    building, return shape
  - SpacetimeDB docs: `useTable` is the primitive this hook wraps

  **Acceptance Criteria**:
  - [ ] `useList('blog', { pageSize: 10 })` returns first 10 items
  - [ ] `loadMore()` advances to next page
  - [ ] `totalCount` reflects actual subscription data count
  - [ ] `where` filters apply correctly via subscription
  - [ ] Sort works client-side
  - [ ] Real-time: new data from subscription appears in correct position
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Paginated list with real-time updates
    Tool: Playwright (playwright skill)
    Preconditions: App running with 25 blog posts in DB
    Steps:
      1. Navigate to blog list page
      2. Verify first 10 items shown (page 1)
      3. Click "Load More" — verify 20 items shown
      4. In another tab, create a new blog post
      5. Return to first tab — verify new post appears in list
      6. Verify totalCount updated to 26
    Expected Result: Pagination + real-time updates work together
    Failure Indicators: Wrong page size, loadMore broken, new data not appearing
    Evidence: .sisyphus/evidence/task-14-use-list.png
  ```

- [ ] 15. Port useInfiniteList hook

  **What to do**:
  - Rewrite `useInfiniteList` for SpacetimeDB’s subscription model
  - Similar to useList but designed for infinite scroll UX (no page numbers, just “load
    more”)
  - Subscribe to all data, slice client-side with increasing window
  - Integrate with `react-intersection-observer` for automatic loading when scrolled to
    bottom
  - Preserve API: `useInfiniteList(table, { where, sort, batchSize })` returns
    `{ data, hasMore, loadMore, isLoading }`
  - Handle data changes: when subscription updates, maintain scroll position

  **Must NOT do**:
  - Do NOT implement virtual scrolling — not in lazyconvex

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Infinite scroll with real-time subscription data — tricky interaction
      between scroll state and data updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14, 16-23)
  - **Blocks**: Tasks 25-28 (demo apps may use infinite list)
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/use-infinite-list.ts` — ENTIRE FILE — Hook to port
  - `packages/betterspace/src/react/use-list.ts` — Related pagination hook

  **Acceptance Criteria**:
  - [ ] Infinite scroll loads more data as user scrolls
  - [ ] `hasMore` correctly indicates remaining data
  - [ ] Real-time updates don’t reset scroll position
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Infinite scroll loads progressively
    Tool: Playwright (playwright skill)
    Preconditions: App running with 50 items
    Steps:
      1. Navigate to list page — verify initial batch shown (e.g., 20 items)
      2. Scroll to bottom — verify more items load automatically
      3. Continue scrolling until all 50 visible
      4. Verify "no more items" state
    Expected Result: Smooth infinite scroll loading
    Failure Indicators: Scroll doesn't trigger load, duplicate items, scroll jumps
    Evidence: .sisyphus/evidence/task-15-infinite-list.png
  ```

- [ ] 16. Port useSearch hook (client-side filtering)

  **What to do**:
  - Rewrite `useSearch` for SpacetimeDB — client-side text search over subscription data
  - SpacetimeDB has no full-text search index — search is done client-side over
    subscribed data
  - Implementation: `String.toLowerCase().includes(query.toLowerCase())` across
    configured searchable fields
  - Preserve API: `useSearch(table, { fields, query, debounceMs })` returns
    `{ results, isSearching }`
  - Add debounce on query input (already in lazyconvex) to avoid excessive re-filtering
  - Document this as a known limitation: client-side search works for demo-scale data
    but would need external service (Meilisearch/Typesense) for production scale

  **Must NOT do**:
  - Do NOT integrate external search service — document as future extensibility
  - Do NOT implement fuzzy search — not in lazyconvex

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Straightforward client-side filtering, but must carefully match existing
      API
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-15, 17-23)
  - **Blocks**: Tasks 25-28 (demo apps use search)
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/use-search.ts` — ENTIRE FILE — Hook to port

  **Acceptance Criteria**:
  - [ ] `useSearch('blog', { fields: ['title', 'content'], query: 'hello' })` returns
    matching rows
  - [ ] Case-insensitive matching works
  - [ ] Debounce prevents excessive re-filtering
  - [ ] Empty query returns all data
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Search filters results
    Tool: Playwright (playwright skill)
    Preconditions: App with blog posts containing various titles
    Steps:
      1. Navigate to search page
      2. Type "react" in search input
      3. Wait 300ms (debounce)
      4. Verify only posts with "react" in title or content are shown
      5. Clear search — verify all posts shown again
    Expected Result: Client-side search works with debounce
    Failure Indicators: No filtering, case-sensitive, no debounce
    Evidence: .sisyphus/evidence/task-16-search.png
  ```

- [ ] 17. Port useForm + useFormMutation hooks

  **What to do**:
  - Rewrite `useForm` and `useFormMutation` to work with SpacetimeDB reducers
  - `useForm` currently integrates with Convex mutations — now integrates with
    `conn.reducers`
  - Form validation uses Zod schemas (from Task 4’s bridge): validate on client, then
    call reducer
  - Port optimistic update pattern: since reducers don’t return values, handle
    optimistic UI via subscription update
  - Handle form submission states: submitting, success, error
  - Port field-level validation and error display
  - Port “dirty” detection and unsaved changes warning
  - Integration with Task 4’s Zod bridge: form schemas derived from SpacetimeDB table
    definitions

  **Must NOT do**:
  - Do NOT change form validation behavior — same UX
  - Do NOT add new form features (e.g., wizard, multi-page)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Forms are DX-critical — must handle validation, submission, optimistic
      updates, error states seamlessly
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-16, 18-23)
  - **Blocks**: Tasks 25-28 (all demo apps use forms)
  - **Blocked By**: Tasks 4 (Zod bridge), 7 (CRUD factory)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/form.ts` — ENTIRE FILE — Form system to port
  - `packages/betterspace/src/react/use-mutate.ts` — Mutation hook (used by forms)

  **Acceptance Criteria**:
  - [ ] `useForm(schema)` provides form state, validation, submission
  - [ ] Zod validation from bridge schema works on client
  - [ ] Calling reducer on submit works
  - [ ] Optimistic UI updates via subscription
  - [ ] Error states displayed correctly
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Form validation and submission
    Tool: Playwright (playwright skill)
    Preconditions: Blog create form rendered
    Steps:
      1. Submit empty form — verify validation errors appear
      2. Fill in title only — verify content validation error
      3. Fill in both title and content — submit
      4. Verify form submits (loading state shown)
      5. Verify success state and new post appears in list
      6. Verify form resets after success
    Expected Result: Full form lifecycle with validation
    Failure Indicators: No validation errors, submit fails, no optimistic update
    Evidence: .sisyphus/evidence/task-17-form.png
  ```

- [ ] 18. Port useSoftDelete, useBulkSelection, useOptimisticMutation + supporting hooks

  **What to do**:
  - Port `useSoftDelete` (69 lines): Toggle _deleted flag instead of removing data.
    Provides `softDelete(id)`, `restore(id)`, undo UI support.
    Calls the rm reducer with soft delete behavior.
  - Port `useBulkSelection` (86 lines): Track selected items for bulk operations.
    Provides `selectedIds`, `toggle(id)`, `selectAll()`, `clearSelection()`,
    `bulkDelete()`, `bulkUpdate()`. Calls bulk reducers.
  - Port `useOptimisticMutation` / `use-optimistic.ts` (55 lines): Optimistic updates
    for SpacetimeDB reducers.
    Since reducers have no return value, optimistically update local state, then
    reconcile when subscription delivers the real update.
  - Port `optimistic-provider.tsx` (13 lines): Context provider for optimistic mutations
  - Port `optimistic-store.ts` (72 lines): Optimistic mutation store with subscriptions
    — manages pending optimistic updates
  - Port `use-online-status.ts` (18 lines): Browser online/offline status hook — used by
    OfflineIndicator component
  - Port `error-toast.ts` (54 lines): Error handler hook with custom error routing —
    used throughout apps
  - Port `use-cache.ts` (102 lines): Cache loading hook with devtools tracking — used by
    movie app with cacheCrud.
    Subscribes to cache table, triggers load/refresh.
  - For optimistic mutations: maintain a local optimistic state layer that overlays
    subscription data until confirmed

  **Must NOT do**:
  - Do NOT add new bulk operations beyond existing ones
  - Do NOT implement undo/redo beyond single-step undo for soft delete

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Three related hooks bundled — individually simple but optimistic mutation
      pattern needs careful thought for subscription-based model
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-17, 19-23)
  - **Blocks**: Tasks 25-28
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/use-soft-delete.ts` (69 lines) — Soft delete hook
  - `packages/betterspace/src/react/use-bulk-selection.ts` (86 lines) — Bulk selection
    hook
  - `packages/betterspace/src/react/use-mutate.ts` (123 lines) — Mutation wrapper with
    optimistic updates
  - `packages/betterspace/src/react/use-optimistic.ts` (55 lines) — Optimistic mutation
    with rollback
  - `packages/betterspace/src/react/optimistic-provider.tsx` (13 lines) — Optimistic
    context provider
  - `packages/betterspace/src/react/optimistic-store.ts` (72 lines) — Optimistic state
    store
  - `packages/betterspace/src/react/use-online-status.ts` (18 lines) — Online/offline
    detection
  - `packages/betterspace/src/react/error-toast.ts` (54 lines) — Error handler hook
  - `packages/betterspace/src/react/use-cache.ts` (102 lines) — Cache loading hook

  **Acceptance Criteria**:
  - [ ] `useSoftDelete` marks items as deleted without removing
  - [ ] `useBulkSelection` tracks multi-select and calls bulk reducers
  - [ ] `useOptimisticMutation` provides instant UI feedback before subscription
    confirms
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Soft delete with undo
    Tool: Playwright (playwright skill)
    Preconditions: Blog post exists
    Steps:
      1. Click delete on a post — verify it disappears from list
      2. Verify undo toast/button appears
      3. Click undo — verify post reappears
      4. Click delete again — DON'T undo — verify post stays gone after timeout
    Expected Result: Soft delete with undo window
    Failure Indicators: Post permanently deleted, undo fails
    Evidence: .sisyphus/evidence/task-18-soft-delete.png

  Scenario: Bulk selection and delete
    Tool: Playwright (playwright skill)
    Preconditions: 10 blog posts exist
    Steps:
      1. Select 3 posts via checkboxes
      2. Verify selection count shows "3 selected"
      3. Click "Delete Selected"
      4. Verify 3 posts removed, 7 remain
    Expected Result: Bulk operations work
    Failure Indicators: Wrong selection count, partial deletion
    Evidence: .sisyphus/evidence/task-18-bulk.png
  ```

- [ ] 19. Port useUpload hook (R2/S3 integration)

  **What to do**:
  - Rewrite `useUpload` to work with the new file upload system (Task 13)
  - Flow: Get presigned URL from procedure → Upload file directly to R2/S3 → Register
    file in SpacetimeDB
  - Preserve API: `useUpload()` returns
    `{ upload(file), progress, isUploading, error, url }`
  - Track upload progress via XHR `onprogress` event
  - Handle multiple concurrent uploads
  - Handle upload cancellation
  - After successful upload, call register_upload reducer to store file metadata

  **Must NOT do**:
  - Do NOT implement image preview/thumbnail generation
  - Do NOT add drag-and-drop — if not in lazyconvex

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: New upload flow (presigned URLs vs Convex storage) — needs careful
      progress tracking
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-18, 20-23)
  - **Blocks**: Task 25 (blog app has file upload)
  - **Blocked By**: Tasks 7, 13 (needs CRUD + file upload system)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/use-upload.ts` — ENTIRE FILE — Upload hook to port
  - `packages/betterspace/src/server/file.ts` — Server-side file system (from Task 13)

  **Acceptance Criteria**:
  - [ ] `upload(file)` sends file to R2/S3 via presigned URL
  - [ ] Progress updates during upload
  - [ ] File metadata registered in SpacetimeDB after upload
  - [ ] Download URL available after registration
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: File upload with progress
    Tool: Playwright (playwright skill)
    Preconditions: App running with upload form
    Steps:
      1. Select a file (e.g., test image)
      2. Click upload — verify progress indicator appears
      3. Wait for upload completion
      4. Verify uploaded file URL is displayed/accessible
      5. Verify file metadata in database (via spacetime sql)
    Expected Result: Upload completes with progress feedback
    Failure Indicators: No progress, upload fails, file not registered
    Evidence: .sisyphus/evidence/task-19-upload.png
  ```

- [ ] 20. Port usePresence hook + makePresence

  **What to do**:
  - Rewrite `usePresence` and `makePresence` for SpacetimeDB
  - **Implementation approach determined by Spike Item 6 + Gate 11 (Presence)
    decision:**
    - If lifecycle events won: use connect/disconnect callbacks for presence
      registration/removal
    - If heartbeat + TTL won: use event-table with periodic heartbeat and TTL
      auto-expiry
    - If neither won cleanly: use heartbeat + manual cleanup reducer
  - `makePresence(config)` creates the presence table definition and reducers (adapted
    to chosen approach)
  - `usePresence(roomId)` subscribes to presence table filtered by roomId, returns
    `{ users, updatePresence }`
  - Handle disconnect: approach-specific cleanup (lifecycle callback OR TTL expiry OR
    manual cleanup)

  **Must NOT do**:
  - Do NOT add cursor tracking or typing indicators beyond what lazyconvex has
  - Do NOT add custom presence data fields beyond what exists

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Real-time presence is architecturally different — SpacetimeDB event-tables
      vs Convex’s presence pattern
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-19, 21-23)
  - **Blocks**: Task 26 (chat app uses presence)
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/use-presence.ts` — ENTIRE FILE — Presence hook to
    port
  - `packages/betterspace/src/server/presence.ts` (98 lines, heartbeat-based) —
    Server-side presence configuration and table definition

  **External References**:
  - SpacetimeDB event-tables documentation (2.0 feature)

  **Acceptance Criteria**:
  - [ ] `usePresence('chat-room-1')` returns list of active users
  - [ ] New user joining updates presence list in real-time
  - [ ] User leaving (disconnect/timeout) removes from presence list
  - [ ] Custom presence data (status, etc.)
    visible to other users
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Presence across two tabs
    Tool: Playwright (playwright skill)
    Preconditions: Chat app running
    Steps:
      1. Open Tab 1 — navigate to chat room
      2. Verify presence shows 1 user
      3. Open Tab 2 — navigate to same chat room
      4. Verify both tabs show 2 users in presence
      5. Close Tab 2
      6. Wait for TTL/heartbeat timeout
      7. Verify Tab 1 shows 1 user again
    Expected Result: Real-time presence tracking
    Failure Indicators: Presence count wrong, stale users not removed
    Evidence: .sisyphus/evidence/task-20-presence.png
  ```

- [ ] 21. Port Form component + defineSteps + ALL form field renderers

  **What to do**:
  - Port `components/form.tsx` (226 lines) — Form wrapper with conflict resolution and
    auto-save
  - Port `components/fields.tsx` (937 lines) — **ALL form field renderers** (text,
    number, boolean, enum/select, date, textarea, rich text, etc.). This is the LARGEST
    component file and the backbone of form rendering.
  - Port `components/file-field.tsx` (242 lines) — File upload field with image
    compression and progress tracking.
    Integrates with useUpload hook (Task 19).
  - Port `components/step-form.tsx` (378 lines) — Multi-step form with stepper UI
    (`defineSteps`)
  - Port `components/editors-section.tsx` (90 lines) — UI for managing document editors
    with add/remove
  - Port `components/index.ts` (10 lines) — Component barrel exports
  - Ensure form components use the Zod bridge (Task 4) for field type inference
  - Preserve accessibility: labels, error messages, focus management

  **Must NOT do**:
  - Do NOT redesign form layout — preserve existing UX
  - Do NOT add new field types

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component with form rendering, field layout, validation display —
      visual + functional
  - **Skills**: [`playwright`]
    - `playwright`: For QA verification of form rendering and interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-20, 22-23)
  - **Blocks**: Tasks 25-28 (all demo apps use forms)
  - **Blocked By**: Tasks 4 (Zod bridge), 7 (CRUD factory)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/components/form.tsx` (226 lines) — Form wrapper with
    conflict resolution
  - `packages/betterspace/src/components/fields.tsx` (937 lines) — ALL field renderers —
    LARGEST component file
  - `packages/betterspace/src/components/file-field.tsx` (242 lines) — File upload field
    with compression
  - `packages/betterspace/src/components/step-form.tsx` (378 lines) — Multi-step form
    stepper
  - `packages/betterspace/src/components/editors-section.tsx` (90 lines) — Editor
    management UI
  - `packages/betterspace/src/components/index.ts` (10 lines) — Barrel exports

  **Acceptance Criteria**:
  - [ ] Form renders all field types correctly
  - [ ] Validation errors display per-field
  - [ ] Multi-step form navigation works (next/prev)
  - [ ] Form submission calls correct reducer
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Multi-step form
    Tool: Playwright (playwright skill)
    Preconditions: App with multi-step create form
    Steps:
      1. Navigate to form page
      2. Fill step 1 fields — click Next
      3. Verify step 2 renders
      4. Click Back — verify step 1 values preserved
      5. Complete all steps — submit
      6. Verify record created
    Expected Result: Multi-step form preserves state across steps
    Failure Indicators: State lost on navigation, step rendering broken
    Evidence: .sisyphus/evidence/task-21-form-component.png
  ```

- [ ] 22. Port remaining components, devtools, schema-playground, and Next.js utilities

  **What to do**:
  - Port `components/permission-guard.tsx` (40 lines): Check user permission (role)
    before rendering children.
    Use SpacetimeDB identity + org membership lookup.
  - Port `components/misc.tsx` (45 lines): OrgAvatar, RoleBadge, OfflineIndicator —
    detect SpacetimeDB connection status (connected/disconnected).
  - Port `components/error-boundary.tsx` (69 lines): `ConvexErrorBoundary` →
    `BetterspaceErrorBoundary` — catch SpacetimeDB-specific errors, display fallback UI.
  - Port `react/devtools.ts` (232 lines): DevTools state management (cache, mutations,
    errors, subscriptions)
  - Port `react/devtools-panel.tsx` (399 lines): `LazyConvexDevtools` →
    `BetterspaceDevtools` — floating debug panel showing subscription state, connection
    status, reducer calls.
  - Port `react/schema-playground.tsx` (187 lines): Interactive schema editor with
    endpoint preview. Adapt to show SpacetimeDB table/reducer definitions instead of
    Convex endpoints.
  - Port `SpacetimeDBProvider` wrapper component (replaces `ConvexProvider`)
  - Port `next/image.ts` (138 lines): Image optimization route handler with
    resizing/compression.
    Used by blog and org apps’ `/api/image/route.ts`. Adapt from Convex storage URLs to
    R2/S3 URLs.
  - Port `next/active-org.ts` (81 lines): Server actions for org cookie and auth token
    management (already mentioned in Task 23, but include Next.js image handler here)
  - Update `react/index.ts` (49 lines) and `next/index.ts` (2 lines) barrel exports

  **Must NOT do**:
  - Do NOT add new debug features to devtools
  - Do NOT change error boundary behavior
  - Do NOT add image transformation beyond what next/image.ts already does

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI components with visual indicators, error displays, debug panels
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-21, 23)
  - **Blocks**: Tasks 25-28
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/components/permission-guard.tsx` (40 lines)
  - `packages/betterspace/src/components/misc.tsx` (45 lines) — OrgAvatar, RoleBadge,
    OfflineIndicator
  - `packages/betterspace/src/components/error-boundary.tsx` (69 lines)
  - `packages/betterspace/src/react/devtools.ts` (232 lines) — DevTools state
  - `packages/betterspace/src/react/devtools-panel.tsx` (399 lines) — DevTools UI
  - `packages/betterspace/src/react/schema-playground.tsx` (187 lines) — Schema editor
  - `packages/betterspace/src/next/image.ts` (138 lines) — Image optimization handler
  - `packages/betterspace/src/next/active-org.ts` (81 lines) — Org cookie management
  - `packages/betterspace/src/react/index.ts` (49 lines) — React barrel exports
  - `packages/betterspace/src/next/index.ts` (2 lines) — Next.js barrel exports

  **Acceptance Criteria**:
  - [ ] PermissionGuard hides content from unauthorized users
  - [ ] OfflineIndicator shows when SpacetimeDB disconnected
  - [ ] ErrorBoundary catches and displays SpacetimeDB errors
  - [ ] Devtools shows subscription state and connection info
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Offline indicator
    Tool: Playwright (playwright skill)
    Preconditions: App running and connected
    Steps:
      1. Verify no offline banner shown
      2. Stop SpacetimeDB instance (kill process)
      3. Verify offline banner appears within 5 seconds
      4. Restart SpacetimeDB
      5. Verify offline banner disappears when reconnected
    Expected Result: Offline state detected and displayed
    Failure Indicators: No banner on disconnect, banner persists after reconnect
    Evidence: .sisyphus/evidence/task-22-offline.png
  ```

- [ ] 23. Port org hooks (useOrg, useMyOrgs) + org components

  **What to do**:
  - Port `useOrg()`: Get current organization context (selected org, role, membership)
  - Port `useMyOrgs()`: List all organizations the current user belongs to
  - Port org switching UI: Select which org to operate in
  - Port invite management hooks: send invite, accept invite, revoke invite
  - Port join request hooks: request to join, approve, reject
  - Port member management hooks: list members, change roles, remove members
  - Port org-related components: OrgSwitcher, MemberList, InviteForm, JoinRequestList
  - All org hooks read from SpacetimeDB subscription to org tables (created by orgCrud
    in Task 8)
  - Port Next.js `active-org` integration (cookie-based org selection for SSR)

  **Must NOT do**:
  - Do NOT add org billing or quota features
  - Do NOT change permission model

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Large subsystem with multiple hooks and components, but follows
      established patterns from other hooks
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 14-22)
  - **Blocks**: Task 28 (org demo app)
  - **Blocked By**: Task 8 (orgCrud factory)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/react/org.tsx` (173 lines) — Organization context with
    role/permission helpers (useOrg, useMyOrgs, OrgProvider)
  - `packages/betterspace/src/server/org-invites.ts` — Invite system
  - `packages/betterspace/src/server/org-join.ts` — Join request system
  - `packages/betterspace/src/server/org-members.ts` — Member management
  - `packages/betterspace/src/next/active-org.ts` — Next.js org integration

  **Acceptance Criteria**:
  - [ ] `useOrg()` returns current org context
  - [ ] `useMyOrgs()` returns user’s org list
  - [ ] Org switching works
  - [ ] Invite flow: send → accept → member added
  - [ ] Join flow: request → approve → member added
  - [ ] Member management: role change, remove
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Full org invite lifecycle
    Tool: Playwright (playwright skill)
    Preconditions: User A is org admin, User B exists but not member
    Steps:
      1. As User A: send invite to User B
      2. As User B: see pending invite
      3. As User B: accept invite
      4. As User A: verify User B appears in member list
      5. As User A: change User B's role to editor
      6. Verify User B has editor permissions
    Expected Result: Complete invite → accept → role change lifecycle
    Failure Indicators: Invite not received, accept fails, role not updated
    Evidence: .sisyphus/evidence/task-23-org-invite.png
  ```

- [ ] 23b. Port packages/fe/ shared frontend package (10 Convex-specific files)

  **What to do**:
  - Port ALL 10 Convex-specific files in `packages/fe/src/` (verified by
    `grep -rl "convex\|CONVEX" packages/fe/src/`):
    - `convex-provider.tsx` — Replace `ConvexReactClient` + `ConvexProvider` +
      `ConvexAuthNextjsProvider` with SpacetimeDB equivalents.
      Create `SpacetimeDBProvider` wrapping the SpacetimeDB React SDK connection.
    - `auth-layout.tsx` — Replace `ConvexAuthNextjsServerProvider` with SpacetimeAuth
      server-side provider
    - `email-login-page.tsx` — Replace `useAuthActions` from `@convex-dev/auth/react`
      with SpacetimeAuth login flow.
      Replace `ConvexError` from `convex/values` with betterspace error type.
    - `login-page.tsx` — Replace `useAuthActions` from `@convex-dev/auth/react` with
      SpacetimeAuth OAuth flow (Google sign-in)
    - `user-menu.tsx` — Replace `convexAuthNextjsToken` + `fetchQuery` + `fetchAction`
      from Convex with SpacetimeDB equivalents for server-side data fetching
    - `env.ts` — Replace `NEXT_PUBLIC_CONVEX_URL` with `NEXT_PUBLIC_SPACETIMEDB_URI`
    - `next-config.ts` — Replace CSP headers from `*.convex.cloud` /
      `wss://*.convex.cloud` to SpacetimeDB domains (localhost:3000 for dev,
      configurable for prod)
    - `error-boundary.tsx` — Replace Convex error patterns with betterspace error types
      (NOTE: this is a DIFFERENT file from
      `packages/betterspace/src/components/error-boundary.tsx` in Task 22 — both need
      porting)
    - `image-route.ts` — Replace Convex storage URLs with R2/S3 presigned URLs for
      Next.js image optimization
    - `utils.ts` — Replace any `CONVEX_URL` or Convex-specific utility references
  - Also verify 4 files WITHOUT Convex deps need no changes: `login-layout.tsx`,
    `proxy.ts`, `root-layout.tsx`, `theme-toggle.tsx`
  - Note: `packages/fe/src/` has 14 total files — 10 with Convex deps (to port), 4
    without (verify these need no changes)
  - Update `packages/fe/package.json` — Replace `convex` + `@convex-dev/auth`
    dependencies with `spacetimedb` (unified package — canonical name validated by
    spike)
  - This package is imported by ALL 4 demo apps — it MUST work before any app can be
    ported

  **Must NOT do**:
  - Do NOT change the component API surface — same props, same exports, different
    internals
  - Do NOT redesign the auth flow — same UX, backed by SpacetimeAuth instead of Convex
    Auth

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 10 files with deep Convex integration (auth, providers, error boundaries,
      image routes, server components) — careful replacement needed
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 3-6) — **PULLED FORWARD** from Wave 3 because
    provider/auth/CSP/WebSocket issues are real integration blockers that library ports
    won’t reveal. Early surface = early fix.
  - **Blocks**: Tasks 25-28 (ALL demo apps import from packages/fe/), walking skeleton
    milestone
  - **Blocked By**: Task 2 (gates — needs spike findings for SpacetimeAuth patterns)

  **References**:

  **Pattern References**:
  - `packages/fe/src/convex-provider.tsx` — Current Convex provider setup
  - `packages/fe/src/auth-layout.tsx` — Server-side auth provider
  - `packages/fe/src/email-login-page.tsx` — Email login using @convex-dev/auth
  - `packages/fe/src/login-page.tsx` — OAuth login using @convex-dev/auth
  - `packages/fe/src/user-menu.tsx` — Server component with Convex queries
  - `packages/fe/src/env.ts` — Environment variable for Convex URL
  - `packages/fe/src/next-config.ts` — CSP headers for Convex domains

  **External References**:
  - SpacetimeAuth React Integration:
    https://spacetimedb.com/docs/spacetimeauth/react-integration
  - SpacetimeAuth uses `react-oidc-context` (standard OIDC library) — the OIDC provider
    is at `https://auth.spacetimedb.com/oidc`. Auth files must use OIDC patterns
    (`useAuth()` from `react-oidc-context`, `AuthProvider` wrapping the app), NOT custom
    SpacetimeDB auth SDK patterns.

  **WHY Each Reference Matters**:
  - `convex-provider.tsx`: THE connection wrapper all apps use — if this doesn’t work,
    nothing works
  - Auth files: Login/logout flow — must work with SpacetimeAuth via
    `react-oidc-context` OIDC patterns before any app can test authenticated features
  - `env.ts` + `next-config.ts`: Configuration that every Next.js app inherits — wrong
    values = connection failures

  **Acceptance Criteria**:
  - [ ] All 10 Convex-specific files ported — no `convex`, `@convex-dev/auth`, or
    `convex-helpers` imports remain
  - [ ] `grep -rl "convex\|CONVEX" packages/fe/src/ | wc -l` returns 0 after porting
  - [ ] `packages/fe/package.json` has SpacetimeDB SDK, no Convex dependencies
  - [ ] SpacetimeDBProvider connects to local Docker instance on port 3000
  - [ ] Auth flow works with SpacetimeAuth (login, logout, session)
  - [ ] CSP headers allow SpacetimeDB WebSocket connections
  - [ ] `NEXT_PUBLIC_SPACETIMEDB_URI` env var used instead of `NEXT_PUBLIC_CONVEX_URL`
  - [ ] `bun fix` passes for `packages/fe/`

  **QA Scenarios**:

  ```
  Scenario: SpacetimeDB provider connects successfully
    Tool: Bash
    Preconditions: SpacetimeDB running via Docker, module published
    Steps:
      1. Start any demo app: `bun dev --filter blog`
      2. Check browser console for WebSocket connection to localhost:3000
      3. Verify no "ConvexReactClient" or "convex" in browser network requests
    Expected Result: App connects to SpacetimeDB via WebSocket
    Failure Indicators: Connection refused, "convex" in network traffic, React hydration errors
    Evidence: .sisyphus/evidence/task-23b-provider.txt

  Scenario: Auth flow works with SpacetimeAuth
    Tool: Playwright
    Preconditions: SpacetimeDB running, auth configured
    Steps:
      1. Navigate to login page
      2. Attempt email login — verify it redirects through SpacetimeAuth
      3. Verify user session is established (user menu shows name)
      4. Click logout — verify session is cleared
    Expected Result: Full login/logout cycle works
    Failure Indicators: Login hangs, session not persisted, logout doesn't clear state
    Evidence: .sisyphus/evidence/task-23b-auth.png
  ```

- [ ] 24. Port backend consumer (packages/be/) to SpacetimeDB modules

  **What to do**:
  - Rewrite `packages/be/convex/` (92 endpoints across 13 files) as SpacetimeDB
    TypeScript modules
  - Also port `packages/be/` ROOT-LEVEL consumer files that import from lazyconvex:
    - `packages/be/lazy.ts` — Imports `setup` + `makeFileUpload` from
      `lazyconvex/server` → port to betterspace
    - `packages/be/t.ts` — Imports `child`, `cvFile`, `cvFiles`, `makeBase`,
      `makeOrgScoped`, `makeOwned`, `makeSingleton`, `orgSchema` from
      `lazyconvex/schema` → port to betterspace schema builders
    - `packages/be/check-schema.ts` — Imports `checkSchema` from `lazyconvex/server` →
      port to betterspace
  - Also port `packages/be/` ROOT-LEVEL files NOT yet listed:
    - `packages/be/ai.ts` — AI endpoint logic.
      If mobile-only → delete (since Swift/mobile removed).
      If web-accessible → port to SpacetimeDB procedures.
    - `packages/be/models.mock.ts` — AI model mock.
      Same disposition as `ai.ts`.
    - `packages/be/env.ts` — Environment variables.
      Replace Convex env vars with SpacetimeDB equivalents.
  - Explicit dispositions for ambiguous files:
    - `packages/be/convex/mobileAi.ts` — **DELETE** (mobile-only AI endpoints,
      Swift/mobile is removed in Task 1)
    - `packages/be/convex/http.ts` — Convex HTTP router for webhooks/CORS. SpacetimeDB
      has no incoming HTTP router equivalent — procedures replace this.
      **Port webhook logic to procedures**, remove the HTTP routing wrapper.
  - Also port `packages/be/convex/tools/weather.ts` — Imports `fetchWithRetry` from
    `lazyconvex/retry`
  - Full inventory: `packages/be/` root has 6 non-config files (`lazy.ts`, `t.ts`,
    `check-schema.ts`, `ai.ts`, `env.ts`, `models.mock.ts`) and `convex/` has 19
    function files — ALL must have explicit disposition (port/delete/reference-only)
  - For each Convex file, create equivalent SpacetimeDB module:
    - Table definitions using `t.*` types (replacing `v.*` Convex validators)
    - Reducers replacing mutations
    - Views replacing queries
    - Procedures replacing actions
  - Use the betterspace CRUD factories (from Tasks 7-11) to generate most reducers
  - Keep Convex files as reference (rename to `*.convex-ref.ts` or move to `reference/`
    directory)
  - Configure `spacetime generate` to produce bindings for all modules
  - Ensure all 13 endpoint files + 3 root files + tools/ have SpacetimeDB equivalents

  **Must NOT do**:
  - Do NOT delete Convex reference files yet (wait for Task 36)
  - Do NOT add new endpoints beyond what exists

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 92 endpoints across 13 files — significant volume, must correctly map each
      Convex function to SpacetimeDB equivalent
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 25-28)
  - **Blocks**: Tasks 25-28 (demo apps need backend modules)
  - **Blocked By**: Tasks 6-12 (dev infra, all CRUD factories, middleware)

  **References**:

  **Pattern References**:
  - `packages/be/convex/` — ALL 13 endpoint files — Each endpoint file to port
  - `packages/be/lazy.ts` — Root-level setup file importing `setup` + `makeFileUpload`
    from `lazyconvex/server`
  - `packages/be/t.ts` — Root-level schema builder file importing from
    `lazyconvex/schema`
  - `packages/be/check-schema.ts` — Root-level schema check importing `checkSchema` from
    `lazyconvex/server`
  - `packages/be/convex/tools/weather.ts` — Tool importing `fetchWithRetry` from
    `lazyconvex/retry`
  - `packages/betterspace/src/server/crud.ts` — CRUD factory (use to generate endpoints)

  **WHY Each Reference Matters**:
  - Each Convex file: Direct 1:1 mapping target — understand what each endpoint does
  - Root-level files (`lazy.ts`, `t.ts`, `check-schema.ts`): These are the consumer’s
    entry points for configuring betterspace — must work with new API
  - `tools/weather.ts`: External API integration using retry utility — validates
    procedure pattern
  - CRUD factory: Most endpoints should be generated via factory, not hand-written

  **Acceptance Criteria**:
  - [ ] All 19 Convex endpoint files have explicit disposition
    (ported/deleted/reference-only) — including `mobileAi.ts` (deleted) and `http.ts`
    (ported to procedures)
  - [ ] All 6 root-level files (`lazy.ts`, `t.ts`, `check-schema.ts`, `ai.ts`, `env.ts`,
    `models.mock.ts`) addressed
  - [ ] `tools/weather.ts` ported to use betterspace retry + SpacetimeDB procedure
  - [ ] `spacetime publish` succeeds with all modules
  - [ ] `spacetime generate` produces complete bindings
  - [ ] All 92 endpoints have SpacetimeDB equivalents (as reducers/views/procedures)
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: All backend modules publish and generate bindings
    Tool: Bash
    Preconditions: SpacetimeDB running locally
    Steps:
      1. Run `bun spacetime:publish` — should succeed with no errors
      2. Run `bun spacetime:generate` — should produce bindings
      3. Count generated reducer/view bindings — should match expected count
      4. Run `spacetime sql betterspace "SELECT name FROM st_table"` — verify all tables exist
    Expected Result: All modules published, all tables created, bindings generated
    Failure Indicators: Publish fails, missing tables, incomplete bindings
    Evidence: .sisyphus/evidence/task-24-backend.txt
  ```

- [ ] 25. Port blog demo app

  **What to do**:
  - Rewrite `apps/blog/` to use SpacetimeDB instead of Convex
  - Replace all Convex imports with betterspace equivalents:
    - `useQuery(api.blog.list)` → `useList('blog', { ... })`
    - `useMutation(api.blog.create)` → `conn.reducers.create_blog(...)`
    - Convex auth → SpacetimeAuth
    - File upload (Convex storage) → R2/S3 via betterspace useUpload
  - Replace `ConvexProvider` with `SpacetimeDBProvider` (betterspace’s provider)
  - Update Next.js config: remove Convex plugin, add SpacetimeDB connection config
  - Port blog features: CRUD, search, pagination, file upload, categories,
    published/draft status
  - Verify the app starts and all pages render
  - Keep Convex code as reference (e.g., in comments or side-by-side files)

  **Must NOT do**:
  - Do NOT redesign the UI — same layout and components
  - Do NOT add new blog features

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Full app port — multiple pages, hooks, components to update.
      Follows established patterns.
  - **Skills**: [`playwright`]
    - `playwright`: For QA verification of app functionality

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24, 26-28)
  - **Blocks**: Task 33 (E2E tests)
  - **Blocked By**: Tasks 14-19, 21, 23b, 24 (hooks, components, packages/fe/ shared
    frontend, backend)

  **References**:

  **Pattern References**:
  - `apps/blog/` — ENTIRE APP — All pages, components, hooks to port
  - `apps/blog/app/` — Next.js App Router pages
  - `apps/blog/convex/` (if separate) — Blog-specific Convex config

  **Acceptance Criteria**:
  - [ ] Blog app starts with `bun dev`
  - [ ] Blog list page renders with posts
  - [ ] Create new blog post works (form + submit)
  - [ ] Edit existing post works
  - [ ] Delete post works (soft delete with undo)
  - [ ] Search works (client-side filtering)
  - [ ] File upload works (image in blog post)
  - [ ] Pagination works
  - [ ] Auth works (login/logout)
  - [ ] No Convex runtime imports remain

  **QA Scenarios**:

  ```
  Scenario: Blog CRUD lifecycle
    Tool: Playwright (playwright skill)
    Preconditions: Blog app running, user logged in
    Steps:
      1. Navigate to blog list — verify page renders
      2. Click "New Post" — verify form renders
      3. Fill title: "Test Post", content: "Hello SpacetimeDB"
      4. Upload an image
      5. Click Submit — verify success
      6. Verify new post appears in list with image
      7. Click post — verify detail page renders with correct content
      8. Click Edit — change title to "Updated Post"
      9. Submit — verify title updated
      10. Click Delete — verify post removed (or soft-deleted)
    Expected Result: Full blog CRUD works end-to-end
    Failure Indicators: Form fails, post not created, image not displayed
    Evidence: .sisyphus/evidence/task-25-blog.png

  Scenario: Blog search
    Tool: Playwright (playwright skill)
    Preconditions: Blog app with 5+ posts
    Steps:
      1. Type "SpacetimeDB" in search box
      2. Wait for debounce (300ms)
      3. Verify only matching posts shown
      4. Clear search — verify all posts shown
    Expected Result: Client-side search filters correctly
    Failure Indicators: No filtering, wrong results
    Evidence: .sisyphus/evidence/task-25-blog-search.png
  ```

- [ ] 26. Port chat demo app (with presence)

  **What to do**:
  - Rewrite `apps/chat/` to use SpacetimeDB instead of Convex
  - Chat uses childCrud (messages are children of channels/rooms)
  - Real-time messaging via SpacetimeDB subscriptions (natural fit)
  - Port presence feature: show who’s online in the chat room
  - Replace all Convex imports with betterspace equivalents
  - Port features: send message, message list (real-time), presence, channels/rooms

  **Must NOT do**:
  - Do NOT add typing indicators if not in original
  - Do NOT add message reactions if not in original

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Real-time features (chat + presence) but follows established hook patterns
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24-25, 27-28)
  - **Blocks**: Task 33 (E2E tests)
  - **Blocked By**: Tasks 14-16, 20, 24 (list hooks, presence hook, backend)

  **References**:

  **Pattern References**:
  - `apps/chat/` — ENTIRE APP — All pages and components

  **Acceptance Criteria**:
  - [ ] Chat app starts with `bun dev`
  - [ ] Messages appear in real-time (no refresh needed)
  - [ ] Send message works
  - [ ] Presence shows active users
  - [ ] Multiple channels/rooms work
  - [ ] No Convex runtime imports

  **QA Scenarios**:

  ```
  Scenario: Real-time chat between two users
    Tool: Playwright (playwright skill)
    Preconditions: Chat app running
    Steps:
      1. Open Tab 1 as User A — navigate to chat room
      2. Open Tab 2 as User B — navigate to same chat room
      3. Verify presence shows 2 users in both tabs
      4. In Tab 1: type "Hello from A" and send
      5. Verify message appears in Tab 2 within 2 seconds
      6. In Tab 2: type "Reply from B" and send
      7. Verify message appears in Tab 1 within 2 seconds
    Expected Result: Real-time bidirectional messaging with presence
    Failure Indicators: Messages delayed > 5s, presence wrong, message not received
    Evidence: .sisyphus/evidence/task-26-chat.png
  ```

- [ ] 27. Port movie demo app (with external API via procedures)

  **What to do**:
  - Rewrite `apps/movie/` to use SpacetimeDB instead of Convex
  - Movie app uses cacheCrud to cache TMDB API responses
  - TMDB API calls: via SpacetimeDB procedures (replacing Convex actions)
  - Port features: movie search (TMDB), movie details, favorites/watchlist, cached
    results
  - Replace Convex imports with betterspace equivalents

  **Must NOT do**:
  - Do NOT change TMDB API integration logic — just the transport
  - Do NOT add new movie features

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: App port with external API integration via procedures
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24-26, 28)
  - **Blocks**: Task 33 (E2E tests)
  - **Blocked By**: Tasks 11, 14-16, 24 (cacheCrud, hooks, backend)

  **References**:

  **Pattern References**:
  - `apps/movie/` — ENTIRE APP

  **Acceptance Criteria**:
  - [ ] Movie app starts with `bun dev`
  - [ ] TMDB search works (via procedure)
  - [ ] Movie details page renders with cached data
  - [ ] Favorites/watchlist CRUD works
  - [ ] Cache refresh works
  - [ ] No Convex runtime imports

  **QA Scenarios**:

  ```
  Scenario: Movie search and favorites
    Tool: Playwright (playwright skill)
    Preconditions: Movie app running, TMDB API key configured
    Steps:
      1. Navigate to movie app — verify page renders
      2. Search for "Inception" — verify TMDB results appear
      3. Click a movie — verify detail page renders
      4. Add to favorites — verify heart icon/indicator
      5. Navigate to favorites — verify movie listed
      6. Remove from favorites — verify removed
    Expected Result: Full movie search + favorites lifecycle
    Failure Indicators: TMDB search fails, favorites not saved
    Evidence: .sisyphus/evidence/task-27-movie.png
  ```

- [ ] 28. Port org demo app (with multi-tenant ACL)

  **What to do**:
  - Rewrite `apps/org/` to use SpacetimeDB instead of Convex
  - Org app is the most complex: multi-tenant, ACL, projects, tasks, wiki, members
  - Uses orgCrud extensively for all data access
  - Port features: org creation, member management, projects, tasks, wiki pages
  - Port permission-based UI: admin sees management controls, viewers see read-only
  - Port org switching (multi-org support)
  - Replace all Convex imports with betterspace equivalents

  **Must NOT do**:
  - Do NOT add new org features
  - Do NOT change permission model

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Most complex demo app — multi-tenant ACL, many features, security-critical
  - **Skills**: [`playwright`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 24-27)
  - **Blocks**: Task 33 (E2E tests)
  - **Blocked By**: Tasks 8, 14-16, 23, 24 (orgCrud, hooks, org hooks, backend)

  **References**:

  **Pattern References**:
  - `apps/org/` — ENTIRE APP — Most complex demo

  **Acceptance Criteria**:
  - [ ] Org app starts with `bun dev`
  - [ ] Create org works
  - [ ] Invite members works
  - [ ] Role-based access: admin/editor/viewer see correct UI
  - [ ] Projects CRUD within org
  - [ ] Tasks CRUD within project
  - [ ] Wiki pages work
  - [ ] Org switching works
  - [ ] No Convex runtime imports

  **QA Scenarios**:

  ```
  Scenario: Multi-tenant org lifecycle
    Tool: Playwright (playwright skill)
    Preconditions: Org app running, 2 user accounts
    Steps:
      1. As Admin: create org "Test Corp"
      2. As Admin: invite User B
      3. As User B: accept invite
      4. As Admin: create project "Alpha"
      5. As User B (editor): create task in "Alpha"
      6. As Admin: verify task visible
      7. Change User B to viewer
      8. As User B: verify cannot create tasks (read-only)
    Expected Result: Full org lifecycle with ACL enforcement
    Failure Indicators: Permissions not enforced, org data leaks between orgs
    Evidence: .sisyphus/evidence/task-28-org.png

  Scenario: Permission enforcement
    Tool: Playwright (playwright skill)
    Preconditions: Org exists with admin and viewer
    Steps:
      1. As viewer: navigate to org management — verify management controls hidden
      2. As viewer: try direct URL to admin page — verify access denied
      3. As admin: verify management controls visible
    Expected Result: UI reflects permissions correctly
    Failure Indicators: Viewer sees admin controls, admin lacks controls
    Evidence: .sisyphus/evidence/task-28-permissions.png
  ```

- [ ] 29. Port ESLint plugin (adapt 16 rules for SpacetimeDB patterns)

  **What to do**:
  - Review all 16 ESLint rules in `packages/betterspace/src/eslint.ts`
  - Categorize each rule:
    - **Keep as-is**: Rules about general patterns (naming, imports, etc.)
    - **Adapt**: Rules referencing Convex-specific patterns (change to SpacetimeDB
      equivalents)
    - **Remove**: Rules only relevant to Convex (if any)
  - For adapted rules:
    - Change Convex import detection to SpacetimeDB import detection
    - Change Convex API patterns (e.g., `api.*.create`) to reducer patterns
    - Update error messages to reference betterspace/SpacetimeDB
  - Ensure rule tests pass (adapt test fixtures)
  - Update rule documentation

  **Must NOT do**:
  - Do NOT add new ESLint rules
  - Do NOT remove rules unless they have zero applicability to SpacetimeDB

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 16 rules need individual assessment, test adaptation, and pattern matching
      updates
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 30-33)
  - **Blocks**: Task 36 (final cleanup)
  - **Blocked By**: Task 3 (type system determines new patterns)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/eslint.ts` — ENTIRE FILE — All 16 rules

  **Acceptance Criteria**:
  - [ ] All applicable ESLint rules work with SpacetimeDB patterns
  - [ ] Rule tests pass
  - [ ] No Convex-specific pattern matching remains in active rules
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: ESLint rules catch violations
    Tool: Bash
    Preconditions: ESLint plugin ported
    Steps:
      1. Create test file with intentional violations of each rule
      2. Run ESLint on test file
      3. Verify each rule produces expected error/warning
      4. Fix violations — verify lint passes
    Expected Result: All rules detect their target violations
    Failure Indicators: Rules don't fire, false positives
    Evidence: .sisyphus/evidence/task-29-eslint.txt
  ```

- [ ] 30. Port CLI commands (remove codegen-swift, adapt remaining)

  **What to do**:
  - Port ALL CLI commands.
    Full inventory (8 source files):
    - `cli.ts` (47 lines) — Main CLI entry point, command dispatcher.
      Rename binary to “betterspace”.
    - `create.ts` (278 lines) — Project scaffolding (`betterspace init`). Adapt to
      scaffold SpacetimeDB module + React app.
    - `add.ts` (400 lines) — Add new tables/endpoints (`betterspace add`). Adapt to
      generate SpacetimeDB table + reducers.
    - `check.ts` (714 lines) — Schema validation and factory consistency
      (`betterspace check`). Adapt for SpacetimeDB tables/reducers.
    - `migrate.ts` (363 lines) — Schema migration diff and planning
      (`betterspace migrate`). Adapt for SpacetimeDB’s auto-migration on republish.
    - `viz.ts` (239 lines) — Schema relationship visualization (`betterspace viz`).
      Adapt for SpacetimeDB table relationships.
    - `docs-gen.ts` (382 lines) — API documentation generator (`betterspace docs`).
      Adapt for SpacetimeDB table/reducer docs.
    - `doctor.ts` (254 lines) — Project diagnostics and health checks
      (`betterspace doctor`). Check SpacetimeDB connection, module status, etc.
  - Remove `codegen-swift` command registration (already deleted file in Task 1, verify
    clean)
  - Update CLI help text, descriptions, and examples
  - Update CLI binary name from “lazyconvex” to “betterspace”

  **Must NOT do**:
  - Do NOT add new CLI commands
  - Do NOT change CLI UX patterns — same flags, same output format

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: ~91K of CLI code (check.ts 28K, add.ts 14K, migrate.ts 15K, docs-gen.ts
      16K, doctor.ts 10K, viz.ts 8K) that deeply understands Convex’s schema model.
      Each command requires understanding SpacetimeDB’s schema representation to port
      correctly. Not mechanical.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 29, 31-33)
  - **Blocks**: Task 36 (final cleanup)
  - **Blocked By**: Task 6 (dev infrastructure determines CLI integration points)

  **References**:

  **Pattern References**:
  - `packages/betterspace/src/cli.ts` (47 lines) — CLI entry point and command
    dispatcher
  - `packages/betterspace/src/create.ts` (278 lines) — Project scaffolding
  - `packages/betterspace/src/add.ts` (400 lines) — Add tables/endpoints
  - `packages/betterspace/src/check.ts` (714 lines) — Schema validation
  - `packages/betterspace/src/migrate.ts` (363 lines) — Migration planning
  - `packages/betterspace/src/viz.ts` (239 lines) — Schema visualization
  - `packages/betterspace/src/docs-gen.ts` (382 lines) — Documentation generator
  - `packages/betterspace/src/doctor.ts` (254 lines) — Project diagnostics

  **Acceptance Criteria**:
  - [ ] `bunx betterspace init` scaffolds a new SpacetimeDB project
  - [ ] `bunx betterspace check` validates SpacetimeDB schemas
  - [ ] `bunx betterspace viz` generates schema visualization
  - [ ] `bunx betterspace docs` generates documentation
  - [ ] No “codegen-swift” command or references remain
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: CLI init command
    Tool: Bash
    Preconditions: Empty test directory
    Steps:
      1. Run `bunx betterspace init` in test directory
      2. Verify SpacetimeDB module scaffold created
      3. Verify package.json updated with dependencies
      4. Verify config files created
      5. Run `bun install` — should succeed
    Expected Result: Project scaffolded and ready to develop
    Failure Indicators: Missing files, broken config, install fails
    Evidence: .sisyphus/evidence/task-30-cli-init.txt
  ```

- [ ] 31a. Port library unit tests — Schema type + branded type tests (~230 tests)

  **What to do**:
  - Port the FIRST QUARTER of `packages/betterspace/src/__tests__/pure.test.ts` — tests
    covering schema types, branded types, type inference, and compile-time validation
  - This subtask focuses on `describe` blocks related to: `SchemaBrand`, `AssertSchema`,
    `SchemaTypeError`, `TableSchema`, type mapping (`t.*` → TypeScript types), and
    schema definition factories
  - Replace Convex `v.*` validators with SpacetimeDB `t.*` type builders in test
    definitions
  - Tests that are purely about TypeScript type checking (compile-time) may need minimal
    changes
  - Port by subsystem, validate each subsystem passes before moving to next

  **Must NOT do**:
  - Do NOT reduce test coverage
  - Do NOT skip tests that are “hard to port” — find solutions

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Type-level tests require deep understanding of both type systems
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 — runs in PARALLEL with Tasks 31b, 31c, 31d
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 3-5 (type system and helpers)

  **References**:
  - `packages/betterspace/src/__tests__/pure.test.ts` — Schema/type test sections

  **Acceptance Criteria**:
  - [ ] ~230 schema/type tests ported and passing
  - [ ] No Convex `v.*` validators remain in these tests
  - [ ] `bun fix` passes

  **QA Scenarios**:
  ```
  Scenario: Schema type tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/betterspace/src/__tests__/schema-types.test.ts --reporter=verbose`
      2. Verify ~230 tests pass, 0 failures
    Expected Result: All schema type tests pass
    Evidence: .sisyphus/evidence/task-31a-schema-tests.txt
  ```

- [ ] 31b. Port library unit tests — CRUD factory tests (~230 tests)

  **What to do**:
  - Port tests covering: `crud()`, `childCrud()`, `singletonCrud()` factories — create,
    update, rm, bulkCreate, bulkUpdate, bulkRm, softDelete, timestamps, ownership, pub
    option
  - Replace `convex-test` mock-based testing with local SpacetimeDB instance testing
  - Update assertions for SpacetimeDB API patterns (e.g., no return values from reducers
    → verify via subscription/query)
  - Create test utilities: `setupTestModule()` (publish to local SpacetimeDB),
    `teardownTestModule()` (reset)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 — runs in PARALLEL with Tasks 31a, 31c, 31d
  - **Blocked By**: Tasks 7, 9, 10, 13d (CRUD factories + test infrastructure)

  **Acceptance Criteria**:
  - [ ] ~230 CRUD factory tests ported and passing
  - [ ] `bun fix` passes

  **QA Scenarios**:
  ```
  Scenario: CRUD factory tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/betterspace/src/__tests__/crud.test.ts --reporter=verbose`
      2. Verify ~230 tests pass, 0 failures
    Expected Result: All CRUD tests pass
    Evidence: .sisyphus/evidence/task-31b-crud-tests.txt
  ```

- [ ] 31c. Port library unit tests — OrgCrud + middleware + utility tests (~230 tests)

  **What to do**:
  - Port tests covering: `orgCrud()` factory (ACL, permissions, org membership),
    middleware (auditLog, slowQueryWarn, inputSanitize, composeMiddleware), utility
    functions (helpers, guard, retry, seed, zod introspection)
  - Replace org membership mocks with real SpacetimeDB tables
  - Replace middleware wrapper tests for SpacetimeDB reducer model

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 — runs in PARALLEL with Tasks 31a, 31b, 31d
  - **Blocked By**: Tasks 8, 12, 13d (orgCrud, middleware, test infrastructure)

  **Acceptance Criteria**:
  - [ ] ~230 org/middleware/utility tests ported and passing
  - [ ] `bun fix` passes

  **QA Scenarios**:
  ```
  Scenario: Org and middleware tests pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/betterspace/src/__tests__/org-middleware.test.ts --reporter=verbose`
      2. Verify ~230 tests pass, 0 failures
    Expected Result: All org/middleware tests pass
    Evidence: .sisyphus/evidence/task-31c-org-tests.txt
  ```

- [ ] 31d. Port library unit tests — CacheCrud + presence + file upload + remaining
  tests (~233 tests)

  **What to do**:
  - Port tests covering: `cacheCrud()` factory (cache load, TTL, invalidation, refresh),
    presence system (heartbeat, cleanup), file upload system (presigned URLs, file
    lifecycle, cleanFiles), and any remaining tests not covered by 31a-31c
  - Replace Convex storage mocks with R2/S3 mocks or local MinIO calls
  - Replace cache timing tests for SpacetimeDB scheduled reducers (or client-side
    fallback per Gate 8)

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 — runs in PARALLEL with Tasks 31a, 31b, 31c
  - **Blocked By**: Tasks 11, 13, 20, 13d (cacheCrud, file upload, presence, test
    infrastructure)

  **Acceptance Criteria**:
  - [ ] ~233 remaining tests ported and passing
  - [ ] Combined total across 31a-31d: >= 923 tests
  - [ ] `bun fix` passes

  **QA Scenarios**:
  ```
  Scenario: All library tests combined pass
    Tool: Bash
    Steps:
      1. Run `bun test packages/betterspace/src/__tests__/ --reporter=verbose`
      2. Count total tests — should be >= 923
      3. Verify 0 failures, 0 skipped
    Expected Result: All tests pass, none skipped
    Failure Indicators: Any test failure, significant test count reduction
    Evidence: .sisyphus/evidence/task-31d-all-tests.txt
  ```

- [ ] 32. Port backend tests (219 tests)

  **What to do**:
  - Port `packages/be/` test files (~219 tests)
  - Replace Convex test utilities (`convex-test`) with SpacetimeDB equivalents
  - Tests should publish module to local SpacetimeDB, run operations, verify state
  - Create backend test utilities:
    - `publishTestModule()` — publish SpacetimeDB module for testing
    - `callReducer(name, args)` — call a reducer and verify via SQL query
    - `queryTable(sql)` — run SQL query for assertions
    - `resetDatabase()` — clean state between tests
  - Port each test category: CRUD operations, auth, permissions, file operations, etc.

  **Must NOT do**:
  - Do NOT reduce test coverage
  - Do NOT skip permission/auth tests — these are security-critical

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 219 tests with new testing infrastructure (local SpacetimeDB vs
      convex-test)
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 29-31, 33)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 24 (backend must be ported first)

  **References**:

  **Pattern References**:
  - `packages/be/__tests__/` or `packages/be/convex/__tests__/` — Backend test files
  - `packages/be/convex/f.test.ts` — Main backend test file (if exists)

  **Acceptance Criteria**:
  - [ ] `bun test packages/be/` passes with ~219 tests
  - [ ] All CRUD operation tests pass
  - [ ] All permission/auth tests pass
  - [ ] No Convex test utilities remain
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: All backend tests pass
    Tool: Bash
    Preconditions: Backend ported, SpacetimeDB running
    Steps:
      1. Run `bun test packages/be/ --reporter=verbose`
      2. Count total tests — should be >= 219
      3. Verify 0 failures
    Expected Result: All backend tests pass
    Failure Indicators: Any failure, especially in permission tests
    Evidence: .sisyphus/evidence/task-32-backend-tests.txt
  ```

- [ ] 33. Port E2E Playwright tests (220 tests) — depends on Task 33b

  **What to do**:
  - Port all 220 Playwright E2E tests across the 4 demo apps
  - PREREQUISITE: Task 33b must be complete (shared E2E infrastructure ported)
  - Update test setup: start SpacetimeDB instead of Convex dev server (already done in
    33b’s `createPlaywrightConfig`)
  - Update test fixtures: replace Convex-specific setup with SpacetimeDB equivalents
    (using 33b’s ported helpers)
  - For each test:
    - Replace Convex dev deployment (`convex dev --once`) with `spacetime publish`
    - Replace Convex-specific selectors if they changed
    - Update auth flow tests for SpacetimeAuth
    - Update file upload tests for R2/S3 pattern
  - Follow AGENTS.md E2E testing strategy: isolate → fix → verify single test first,
    then expand
  - Maintain timeout rules from AGENTS.md

  **Must NOT do**:
  - Do NOT run full suite blindly — follow the progressive verification strategy
  - Do NOT reduce E2E coverage

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: 220 tests across 4 apps — significant scope, each test may need different
      adaptations
  - **Skills**: [`playwright`]
    - `playwright`: Core tool for running and debugging E2E tests

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 29-32)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 25-28 (all demo apps must be ported and running)

  **References**:

  **Pattern References**:
  - `apps/blog/tests/` or equivalent — Blog app E2E tests
  - `apps/chat/tests/` — Chat app E2E tests
  - `apps/movie/tests/` — Movie app E2E tests
  - `apps/org/tests/` — Org app E2E tests
  - `playwright.config.ts` — Playwright configuration

  **WHY Each Reference Matters**:
  - Each test directory: Direct port targets — understand what each test verifies
  - Playwright config: Must update for SpacetimeDB dev server startup

  **Acceptance Criteria**:
  - [ ] All 220 E2E tests pass
  - [ ] No Convex-specific test setup remains
  - [ ] Playwright config updated for SpacetimeDB
  - [ ] Tests follow AGENTS.md timeout rules
  - [ ] `bun test:e2e` passes

  **QA Scenarios**:

  ```
  Scenario: E2E test suite passes
    Tool: Bash
    Preconditions: All 4 apps ported and running
    Steps:
      1. Run `bun test:e2e -- --workers=1 --timeout=10000 --reporter=dot`
      2. Verify all 220 tests pass
      3. Check for flaky tests (run twice)
    Expected Result: Full E2E suite green
    Failure Indicators: Any test failure, timeouts, flaky tests
    Evidence: .sisyphus/evidence/task-33-e2e.txt
  ```

- [ ] 33b. Port packages/e2e/ shared E2E infrastructure (9 Convex-specific files)

  **What to do**:
  - Port ALL 9 files in `packages/e2e/src/` from Convex to SpacetimeDB:
    - `playwright-config.ts` — Replace `CONVEX_TEST_MODE=true` with SpacetimeDB test
      mode, replace `convex dev --once` web server command with `spacetime publish`
      equivalent
    - `global-setup.ts` — Replace `ConvexHttpClient` with SpacetimeDB client, replace
      `anyApi.testauth.ensureTestUser` and `anyApi.testauth.cleanupTestData` mutations
      with SpacetimeDB reducer calls
    - `global-teardown.ts` — Replace `convex env remove CONVEX_TEST_MODE` with
      SpacetimeDB cleanup
    - `org-helpers.ts` — Replace `ConvexHttpClient` + `anyApi` proxy with SpacetimeDB
      client for 8 test mutations: `ensureTestUser`, `cleanupTestData`,
      `createTestUser`, `addTestOrgMember`, `removeTestOrgMember`, `cleanupOrgTestData`,
      `cleanupTestUsers`, `org.create`
    - `auth-proxy.ts` — Adapt auth proxy for SpacetimeAuth
    - `base-test.ts` — Update base test fixture for SpacetimeDB connection
    - `base-page.ts` — Update base page object for SpacetimeDB-backed pages
    - `base-chat.ts` — Update chat-specific test utilities for SpacetimeDB subscriptions
    - `helpers.ts` — Update test helpers for SpacetimeDB patterns
  - Replace the `tc` test client pattern (action/mutation/query methods via
    ConvexHttpClient) with SpacetimeDB equivalent (reducer calls + table reads via
    SpacetimeDB client)
  - Update `packages/e2e/package.json` — Replace `convex` dependency with `spacetimedb`
    (unified package — canonical name validated by spike)
  - Ensure `createPlaywrightConfig()` still works for all 4 demo apps

  **Must NOT do**:
  - Do NOT change the public API of `createPlaywrightConfig()` — same interface,
    different internals
  - Do NOT reduce test helper coverage

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 9 files with deep Convex-specific integration that must be carefully
      replaced with SpacetimeDB equivalents while preserving the same test helper API
      surface
  - **Skills**: [`playwright`]
    - `playwright`: Core tool for verifying E2E infrastructure works correctly

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 — must complete BEFORE Task 33 (E2E tests depend on this
    infrastructure)
  - **Blocks**: Task 33 (all E2E tests use this shared infrastructure)
  - **Blocked By**: Tasks 6, 13d, 24 (SpacetimeDB dev infra, test infrastructure,
    backend modules)

  **References**:

  **Pattern References**:
  - `packages/e2e/src/playwright-config.ts` — Playwright config factory with
    Convex-specific web server setup
  - `packages/e2e/src/global-setup.ts` — Global setup creating ConvexHttpClient, calling
    testauth mutations
  - `packages/e2e/src/global-teardown.ts` — Teardown running `convex env remove`
  - `packages/e2e/src/org-helpers.ts` — Org test helpers using ConvexHttpClient + anyApi
    for 8 mutations
  - `packages/e2e/src/auth-proxy.ts` — Auth proxy for test authentication
  - `packages/e2e/src/base-test.ts` — Base test fixture definition
  - `packages/e2e/src/base-page.ts` — Base page object model
  - `packages/e2e/src/base-chat.ts` — Chat-specific test utilities
  - `packages/e2e/src/helpers.ts` — General test helpers

  **API/Type References**:
  - `packages/be/convex/testauth.ts` — Test auth reducers (ensureTestUser,
    cleanupTestData, createTestUser, etc.)

  **WHY Each Reference Matters**:
  - `playwright-config.ts`: The config factory ALL 4 demo app E2E configs use — if this
    breaks, zero E2E tests run
  - `global-setup.ts` / `global-teardown.ts`: Test lifecycle management — sets up test
    users and cleans up after
  - `org-helpers.ts`: Org-specific E2E helpers — needed by org app’s 128 tests
  - `auth-proxy.ts` / `base-test.ts`: Auth and test fixtures — foundational for all test
    suites
  - `testauth.ts`: Backend test reducers that E2E setup calls — must exist and work
    before E2E infra can be tested

  **Acceptance Criteria**:
  - [ ] All 9 files in `packages/e2e/src/` ported to SpacetimeDB
  - [ ] No `ConvexHttpClient` or `anyApi` imports remain
  - [ ] No `convex env` CLI calls remain
  - [ ] `createPlaywrightConfig()` produces valid Playwright config for SpacetimeDB
  - [ ] Global setup successfully connects to SpacetimeDB and creates test user
  - [ ] Global teardown cleans up SpacetimeDB test state
  - [ ] `bun fix` passes for `packages/e2e/`

  **QA Scenarios**:

  ```
  Scenario: E2E infrastructure connects to SpacetimeDB
    Tool: Bash
    Preconditions: SpacetimeDB running locally, backend modules published
    Steps:
      1. Run global-setup programmatically — should connect to SpacetimeDB and create test user
      2. Verify test user exists in SpacetimeDB: `spacetime sql betterspace "SELECT * FROM user WHERE is_test = true"`
      3. Run global-teardown — should clean up test state
      4. Verify test data removed: `spacetime sql betterspace "SELECT COUNT(*) FROM user WHERE is_test = true"` — should be 0
    Expected Result: Full E2E lifecycle (setup → test state → teardown) works against SpacetimeDB
    Failure Indicators: Connection refused, test user not created, cleanup fails
    Evidence: .sisyphus/evidence/task-33b-e2e-infra.txt

  Scenario: createPlaywrightConfig produces valid config
    Tool: Bash
    Preconditions: packages/e2e/ ported
    Steps:
      1. Import and call `createPlaywrightConfig({ port: 3099 })` in a test script
      2. Verify returned config has correct webServer command (SpacetimeDB, not Convex)
      3. Verify globalSetup and globalTeardown paths are correct
      4. Verify env vars use SpacetimeDB equivalents (no CONVEX_TEST_MODE)
    Expected Result: Config object valid for SpacetimeDB-backed Next.js app
    Failure Indicators: Config references Convex, missing globalSetup, wrong env vars
    Evidence: .sisyphus/evidence/task-33b-config-check.txt
  ```

- [ ] 34. Rewrite all documentation for SpacetimeDB

  **What to do**:
  - Rewrite ALL 12 doc files in `docs/` for SpacetimeDB (explicit disposition for each):
    - `docs/quickstart.md` — **REWRITE (CRITICAL — new users start here)**: Replace
      Convex setup with SpacetimeDB setup (Docker, `bun spacetime:up`, publish,
      generate, connect)
    - `docs/data-fetching.md` — **REWRITE**: Replace Convex queries with SpacetimeDB
      subscriptions, useTable patterns
    - `docs/testing.md` — **REWRITE**: Replace convex-test with local SpacetimeDB
      testing patterns
    - `docs/organizations.md` — **REWRITE**: Same org concepts but with SpacetimeDB
      reducers/tables
    - `docs/forms.md` — **REWRITE**: Update for Zod bridge + SpacetimeDB reducers
    - `docs/api-reference.md` — **REWRITE**: Complete API rewrite for betterspace
      functions
    - `docs/custom-queries.md` — **REWRITE**: Replace Convex custom queries with
      SpacetimeDB subscription patterns + procedures
    - `docs/recipes.md` — **REWRITE**: Update code examples for SpacetimeDB patterns
    - `docs/schema-evolution.md` — **REWRITE**: Replace Convex schema migration with
      SpacetimeDB module update/migration patterns
    - `docs/ejecting.md` — **REWRITE**: Update ejection guide for SpacetimeDB (how to
      stop using betterspace and use raw SpacetimeDB SDK)
    - `docs/migration.md` — **REWRITE AS “Coming from lazyconvex”**: Transform into
      migration guide for existing lazyconvex users transitioning to betterspace
    - `docs/native-apps.md` — **REMOVE or archive** (no native apps in betterspace)
  - Rewrite getting-started guide for SpacetimeDB setup
  - Add migration guide: “Coming from lazyconvex” — help existing users transition
  - Document known limitations: client-side search, client-side pagination, no built-in
    file storage
  - Document SpacetimeDB-specific concepts: subscriptions, reducers, views, procedures,
    event-tables
  - Document deployment options with clear instructions:
    - **Local dev**: Docker Compose (`bun spacetime:up`) — primary recommended approach
    - **Maincloud**: `spacetime publish --server maincloud` — managed hosting
    - **Self-hosted (Docker)**: Docker + Nginx reverse proxy + Let’s Encrypt —
      recommended self-hosted approach.
      Include a production `docker-compose.prod.yml` example with volume persistence,
      restart policy, and optional Nginx sidecar
    - **Self-hosted (manual)**: Link to SpacetimeDB’s official Ubuntu guide
      (`spacetimedb.com/docs/how-to/deploy/self-hosting/`) as alternative
    - Note: Docker image is `clockworklabs/spacetime:latest` (official, actively
      maintained)

  **Must NOT do**:
  - Do NOT reference Convex as if it’s the current backend — betterspace IS SpacetimeDB
  - Do NOT leave Convex code examples in docs (except in migration guide)

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Documentation rewrite — prose, examples, structure
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 35-36)
  - **Blocks**: Task 36
  - **Blocked By**: Tasks 7-23 (need to know final API before documenting)

  **References**:

  **Pattern References**:
  - `docs/` — ALL documentation files to rewrite
  - `packages/betterspace/src/` — Final API to document

  **Acceptance Criteria**:
  - [ ] All 12 doc files addressed (11 rewritten + 1 removed/archived)
  - [ ] No Convex code examples remain (except migration guide)
  - [ ] Getting started guide works end-to-end
  - [ ] Known limitations documented
  - [ ] Migration guide covers key differences

  **QA Scenarios**:

  ```
  Scenario: Getting started guide is followable
    Tool: Bash
    Preconditions: Clean environment
    Steps:
      1. Follow getting-started.md step by step
      2. Verify each command works as documented
      3. Verify final result matches what docs promise
    Expected Result: New user can set up betterspace from docs alone
    Failure Indicators: Missing steps, wrong commands, broken examples
    Evidence: .sisyphus/evidence/task-34-docs.txt
  ```

- [ ] 35. Update package.json, README, AGENTS.md for betterspace

  **What to do**:
  - Update root `README.md`: Replace all lazyconvex branding with betterspace, update
    feature descriptions for SpacetimeDB, update badges, update installation
    instructions
  - Update `AGENTS.md`: Replace Convex-specific rules with SpacetimeDB equivalents:
    - Replace “convex dev --once” references with SpacetimeDB commands
    - Update E2E testing setup for SpacetimeDB
    - Remove Swift/mobile/desktop references
    - Update architecture table (no desktop/mobile/swift-core)
    - Keep code style rules (no comments, arrow functions, etc.)
      — these are language-level, not backend-level
  - Update `packages/betterspace/package.json`:
    - Name: “betterspace”
    - Description: Update for SpacetimeDB
    - Dependencies: SpacetimeDB SDK, remove Convex
    - Verify ALL 12 export entry points work: `.`, `./server`, `./zod`, `./retry`,
      `./schema`, `./react`, `./components`, `./eslint`, `./next`, `./test`,
      `./test/discover`, `./seed`
    - Peer dependencies: Remove Convex-specific (`convex`, `@convex-dev/auth`,
      `convex-helpers`), add SpacetimeDB (`spacetimedb` — unified package, canonical
      name validated by spike), keep unchanged (`@auth/core`, `@stepperize/react`,
      `@tanstack/react-form`, `next`, `react`, `react-dom`, `zod`)
    - Runtime deps: Keep unchanged (`browser-image-compression`,
      `next-navigation-guard`, `react-dropzone`, `sharp`)
    - Keywords: spacetimedb, crud, typesafety
  - Update root `package.json` scripts:
    - `test:web` — Replace `CONVEX_TEST_MODE=true` + `convex dev --once` with
      SpacetimeDB test mode (`SPACETIMEDB_TEST_MODE=true` + `spacetime publish`)
    - `dev:web` — Replace Convex dev server start with SpacetimeDB Docker start
    - Remove Swift-specific scripts: `build:desktop`, `build:mobile`, `clean:desktop`,
      `clean:mobile`, `dev:desktop`, `dev:mobile`, `format:swift`, `lint:swift`,
      `codegen:swift`
    - Add SpacetimeDB scripts: `spacetime:up`, `spacetime:down`, `spacetime:publish`,
      `spacetime:generate`, `spacetime:reset`
  - Update `.env.example`: Replace 5 CONVEX_* vars (`CONVEX_SELF_HOSTED_ADMIN_KEY`,
    `CONVEX_SELF_HOSTED_URL`, `CONVEX_SITE_URL`, `CONVEX_URL`, `NEXT_PUBLIC_CONVEX_URL`)
    with SpacetimeDB equivalents (`SPACETIMEDB_URI`, `NEXT_PUBLIC_SPACETIMEDB_URI`,
    etc.)
  - Update `.env`: Same replacements (gitignored, but template should match)
  - Update `turbo.json`: Verify Convex env vars replaced with SpacetimeDB equivalents
    (initial replacement in Task 1, verify here)
  - Update all workspace `package.json` files: reference “betterspace” not “lazyconvex”
  - Update `packages/e2e/package.json`: Replace `convex` dependency with `spacetimedb`
    (unified package — canonical name validated by spike)
  - Update `packages/fe/package.json`: Replace `convex` and `@convex-dev/auth` with
    `spacetimedb`
  - Update `LICENSE` if it exists

  **Must NOT do**:
  - Do NOT change license
  - Do NOT remove attribution to lazyconvex origins

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: README, AGENTS.md, package metadata — prose and configuration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 6 (with Tasks 34, 36)
  - **Blocks**: Task 36
  - **Blocked By**: All previous tasks (need final state before updating meta files)

  **References**:

  **Pattern References**:
  - `README.md` — Current README
  - `AGENTS.md` — Development rules
  - `packages/betterspace/package.json` — Package config

  **Acceptance Criteria**:
  - [ ] README describes betterspace with SpacetimeDB
  - [ ] AGENTS.md updated for SpacetimeDB dev workflow
  - [ ] Package.json publishable as “betterspace”
  - [ ] All 12 export entry points resolve correctly
  - [ ] No Convex peer/runtime dependencies remain (only SpacetimeDB + unchanged deps)
  - [ ] `turbo.json` has zero Convex env var references
  - [ ] `packages/e2e/package.json` uses SpacetimeDB SDK
  - [ ] `packages/fe/package.json` uses SpacetimeDB SDK
  - [ ] No “lazyconvex” references remain in user-facing files
  - [ ] `bun fix` passes

  **QA Scenarios**:

  ```
  Scenario: Package ready to publish
    Tool: Bash
    Preconditions: All meta files updated
    Steps:
      1. Run `bun pack` in packages/betterspace/ — should create tarball
      2. Inspect tarball contents — verify correct files included
      3. Verify package.json has correct name, version, exports, peer dependencies
      4. Run `grep -r "lazyconvex" README.md AGENTS.md packages/betterspace/package.json` — should be empty
      5. Run `grep -r "convex" turbo.json packages/betterspace/package.json packages/e2e/package.json packages/fe/package.json | grep -v "spacetime"` — should be empty (no stale Convex deps)
    Expected Result: Package ready for npm publish, zero Convex references in config
    Failure Indicators: Wrong package name, missing exports, stale Convex dependencies, stale references
    Evidence: .sisyphus/evidence/task-35-package.txt
  ```

- [ ] 36. Final cleanup — remove Convex reference code, verify clean build

  **What to do**:
  - Remove all Convex reference code that was kept during the port:
    - Delete `*.convex-ref.ts` files (or `reference/` directories)
    - Delete Convex config files (`convex.json`, `convex/` directories in apps)
    - Remove Convex dependencies from all package.json files
    - Delete any `convex/` directories in demo apps
  - Run `bun install` to clean dependency tree
  - Run `bun fix` to verify no lint errors
  - Run `bun test:all` to verify everything still passes without Convex
  - Run `grep -r "convex" --include="*.ts" --include="*.tsx" --include="*.json" .` to
    find any remaining references
  - Clean up `.gitignore` for SpacetimeDB artifacts
  - Verify `spike/` directory is removed (throwaway from Task 2)

  **Must NOT do**:
  - Do NOT delete Convex references from docs migration guide (intentional)
  - Do NOT break anything — this is the final cleanup before release

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: File deletions and verification — mechanical cleanup
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 6 — Sequential (after Tasks 34-35, before Final Wave)
  - **Blocks**: F1-F4 (final verification)
  - **Blocked By**: Tasks 29-35 (everything must be ported before removing references)

  **References**:

  **Pattern References**:
  - All `*.convex-ref.ts` files
  - All `convex/` directories
  - `spike/` directory

  **Acceptance Criteria**:
  - [ ] No Convex runtime code remains (only in docs migration guide)
  - [ ] `bun install` succeeds
  - [ ] `bun fix` passes
  - [ ] `bun test:all` passes
  - [ ] No `convex` package in any node_modules
  - [ ] `spike/` directory removed

  **QA Scenarios**:

  ```
  Scenario: Clean codebase with no Convex artifacts
    Tool: Bash
    Preconditions: All cleanup done
    Steps:
      1. Run `grep -r "convex" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v .git | grep -v docs/migration` — should be empty
      2. Run `find . -name "convex.json" -not -path "./node_modules/*"` — should be empty
      3. Run `find . -type d -name "convex" -not -path "./node_modules/*"` — should be empty
      4. Run `bun install && bun fix && bun test:all` — all pass
    Expected Result: No Convex artifacts, clean build
    Failure Indicators: Stale references, broken imports, test failures
    Evidence: .sisyphus/evidence/task-36-cleanup.txt
  ```

* * *

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle` Read the plan end-to-end.
  For each “Must Have”: verify implementation exists (read file, run command).
  For each “Must NOT Have”: search codebase for forbidden patterns — reject with
  file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare
  deliverables against plan.
  Output:
  `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high` Run `bun fix` + `bun test:all`.
  Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in
  prod, commented-out code, unused imports.
  Check AI slop: excessive comments, over-abstraction, generic names
  (data/result/item/temp).
  Verify AGENTS.md rules: no comments, arrow functions, no reduce/forEach/any.
  Output:
  `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill) Start from
  clean state. Launch each of the 4 demo apps.
  Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence.
  Test cross-app features (org system, file upload, presence, search).
  Test edge cases: empty state, invalid input, rapid actions, offline recovery.
  **Latency re-measurement**: Run the same latency benchmarks from the spike (reducer →
  subscription update) but through the actual betterspace library hooks.
  Compare against spike baseline stored in FINDINGS.md.
  Flag if >2x regression (e.g., spike measured 50ms raw, library adds >50ms overhead =
  100ms+ total). Save to `.sisyphus/evidence/final-qa/`. Output:
  `Scenarios [N/N pass] | Apps [4/4 running] | Edge Cases [N tested] | Latency [Xms library vs Yms spike baseline] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep` For each task: read “What to do”, read
  actual diff. Verify 1:1 — everything in spec was built (no missing), nothing beyond
  spec was built (no creep).
  Check “Must NOT do” compliance.
  Detect cross-task contamination: Task N touching Task M’s files.
  Flag unaccounted changes.
  Verify no Convex runtime imports remain (reference files OK). Output:
  `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

* * *

## Maincloud Regression Wave (AFTER Final Verification — requires user credentials)

> **This wave runs AFTER F1-F4 all APPROVE on local Docker.** The user will provide
> Maincloud credentials.
> Until then, this wave is BLOCKED. Purpose: Verify zero regressions between self-hosted
> (Docker) and Maincloud (managed).

**Prerequisites**:
- All F1-F4 verdicts: APPROVE

- User provides Maincloud credentials (URI, auth tokens)

- All 4 demo apps passing on local Docker

- [ ] M1. **Deploy to Maincloud + run full test suite** — `deep`

  **What to do**:
  - Receive Maincloud credentials from user and configure:
    - `spacetime server add maincloud --url <provided-url>`
    - Set Maincloud as publish target
  - Publish ALL SpacetimeDB modules to Maincloud: `spacetime publish --server maincloud`
  - Update `.env` files in each demo app to point to Maincloud URI instead of
    `localhost:3000`
  - Start each demo app locally (Next.js dev server) pointed at Maincloud backend
  - Run the COMPLETE test suite against Maincloud:
    1. `bun test` — Library unit tests (should all pass — mostly logic tests)
    2. `bun test packages/be/` — Backend tests against Maincloud instance
    3. E2E tests per app (using Playwright against local Next.js → Maincloud
       SpacetimeDB):
       - `timeout 60 bun with-env playwright test apps/blog/` — 52 tests
       - `timeout 60 bun with-env playwright test apps/chat/` — 26 tests
       - `timeout 30 bun with-env playwright test apps/movie/` — 14 tests
       - `timeout 120 bun with-env playwright test apps/org/` — 128 tests
  - Document ANY differences between Docker and Maincloud behavior

  **Must NOT do**:
  - Do NOT modify code to “fix” Maincloud-specific issues — if something fails on
    Maincloud but passes on Docker, that’s a regression to investigate
  - Do NOT skip any test — run the full suite

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Full regression suite against production infrastructure — must be thorough
  - **Skills**: [`playwright`]
    - `playwright`: E2E test execution against Maincloud-backed apps

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Post-Final — Sequential
  - **Blocks**: Release
  - **Blocked By**: F1-F4 (all must APPROVE), user credentials

  **Acceptance Criteria**:
  - [ ] All SpacetimeDB modules publish to Maincloud successfully
  - [ ] All 4 demo apps start and connect to Maincloud
  - [ ] Library tests pass: `bun test` — same count as Docker
  - [ ] Backend tests pass: `bun test packages/be/` — same count as Docker
  - [ ] E2E tests pass: all 220 tests — same count as Docker
  - [ ] ZERO regressions: any test that passes on Docker must also pass on Maincloud
  - [ ] If ANY regression found: document in
    `.sisyphus/evidence/maincloud-regressions.md` with exact test name, error, and
    Docker vs Maincloud comparison

  **QA Scenarios**:

  ```
  Scenario: All demo apps work against Maincloud
    Tool: Playwright
    Preconditions: Modules published to Maincloud, apps configured with Maincloud URI
    Steps:
      1. Start blog app: `bun dev --filter blog`
      2. Navigate to http://localhost:3001 — verify blog list loads with data from Maincloud
      3. Create a new blog post — verify it appears in real-time
      4. Start chat app: `bun dev --filter chat`
      5. Navigate to http://localhost:3002 — verify chat loads, send a message
      6. Start movie app: `bun dev --filter movie`
      7. Navigate to http://localhost:3003 — verify movie list loads from TMDB
      8. Start org app: `bun dev --filter org`
      9. Navigate to http://localhost:3004 — verify org dashboard loads
    Expected Result: All 4 apps fully functional against Maincloud
    Failure Indicators: Connection refused, WebSocket errors, missing data, stale subscriptions
    Evidence: .sisyphus/evidence/maincloud-apps-qa/

  Scenario: Full E2E suite passes against Maincloud
    Tool: Bash + Playwright
    Preconditions: All apps running against Maincloud
    Steps:
      1. Run `bun test:e2e -- --workers=1 --timeout=15000 --reporter=dot`
      2. Compare pass count with Docker results in .sisyphus/evidence/
      3. If any failure: capture screenshot + error log
    Expected Result: 220/220 E2E tests pass (same as Docker)
    Failure Indicators: Any test failure, timeout differences, flaky tests only on Maincloud
    Evidence: .sisyphus/evidence/maincloud-e2e-results.txt

  Scenario: Latency is acceptable on Maincloud
    Tool: Bash
    Preconditions: Modules published to Maincloud
    Steps:
      1. Time a reducer call: `time spacetime call betterspace create_blog '{"title":"test","content":"test"}' --server maincloud`
      2. Time a SQL query: `time spacetime sql betterspace "SELECT COUNT(*) FROM blog" --server maincloud`
      3. Compare with Docker equivalents
    Expected Result: Maincloud latency within 2x of Docker (network overhead expected)
    Failure Indicators: >5s reducer calls, >3s queries (excluding cold start)
    Evidence: .sisyphus/evidence/maincloud-latency.txt
  ```

- [ ] M2. **Maincloud vs Docker comparison report** — `writing`

  **What to do**:
  - Create `.sisyphus/evidence/maincloud-comparison.md` summarizing:
    - Total tests run on Docker vs Maincloud
    - Pass/fail counts — must be identical
    - Any latency differences observed
    - Any behavioral differences (even minor)
    - WebSocket stability comparison
    - Cold start behavior on Maincloud
  - If ZERO regressions: declare Maincloud parity achieved
  - If ANY regressions: list each with root cause analysis and whether it’s a
    betterspace bug or a Maincloud platform difference

  **Acceptance Criteria**:
  - [ ] Comparison report exists at `.sisyphus/evidence/maincloud-comparison.md`
  - [ ] All test counts match between Docker and Maincloud
  - [ ] Any regressions have documented root cause

* * *

## Commit Strategy (Universal Rule)

> **Commit early, commit often.** Every agent commits after every smallest unit of
> completed work. No batching.
> No waiting. No “groups with Task N”.

**Rule**: After completing ANY coherent unit of work (a file ported, a test passing, a
config updated), immediately:
1. `bun fix` — MUST pass (pre-commit gate, non-negotiable)
2. `git add` the relevant files
3. `git commit` with a conventional commit message: `type(scope): description`
4. `git push` — Push immediately.
   CI is disabled, so push freely with zero wait.

**Push policy**: Every commit gets pushed immediately.
No batching, no waiting, no “I’ll push later”.
CI workflows are disabled (`.github/workflows/ci.yml.disabled`) so pushes are instant
with no pipeline delay.
All quality checks are enforced locally via `bun fix` pre-commit.
User will re-enable CI when they confirm all work is done.

**Commit types**: `feat`, `fix`, `refactor`, `test`, `chore`, `docs` **Scope examples**:
`crud`, `hooks`, `blog-app`, `infra`, `eslint`, `cli`, `e2e`

**Examples of good commit granularity**:
- `feat(crud): port create reducer to spacetimedb`
- `feat(crud): port update and delete reducers`
- `test(crud): port 45 crud unit tests`
- `feat(blog-app): replace ConvexProvider with SpacetimeDBProvider`
- `feat(blog-app): port blog list page to useTable`
- `chore(infra): add docker-compose for local spacetimedb`
- `docs: rewrite data-fetching guide for spacetimedb`

**Pre-commit is mandatory**: If `bun fix` fails, fix the issue BEFORE committing.
Never skip.

* * *

## Success Criteria

### Verification Commands

```bash
bun fix              # Expected: 0 errors
bun test:all         # Expected: all tests pass (~1,362 tests)
bun dev --filter blog  # Expected: blog app starts, accessible at localhost
bun dev --filter chat  # Expected: chat app starts with real-time presence
bun dev --filter movie # Expected: movie app starts with TMDB integration
bun dev --filter org   # Expected: org app starts with multi-tenant ACL
spacetime sql betterspace "SELECT COUNT(*) FROM blog"  # Expected: returns count
```

### Final Checklist

- [ ] All “Must Have” features present and working
- [ ] All “Must NOT Have” patterns absent from codebase
- [ ] All 4 demo apps start and render correctly
- [ ] All tests pass (`bun test:all`)
- [ ] No Convex runtime dependencies (only reference files)
- [ ] Package publishable as “betterspace”
- [ ] Documentation complete and accurate
- [ ] AGENTS.md updated for betterspace

### Maincloud Parity Checklist (after user provides credentials)

- [ ] All modules publish to Maincloud successfully
- [ ] All 4 demo apps connect and function against Maincloud
- [ ] All tests pass on Maincloud — ZERO regressions vs Docker
- [ ] Comparison report documents parity at `.sisyphus/evidence/maincloud-comparison.md`
