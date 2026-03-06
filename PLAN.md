# betterspace — Port of lazyconvex to SpacetimeDB 2.0

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
documentation.** _(Note: While the original intent was “1:1 port”, the strategic
overhaul reframed this as “same DX philosophy, platform-native implementation” — the API
embraces SpacetimeDB’s model rather than forcing Convex patterns.)_

### Platform Context

**Native API Concept Mapping**:

| Concept          | lazyconvex (Convex)                      | betterspace (SpacetimeDB)                                   | Rationale                           |
| ---------------- | ---------------------------------------- | ----------------------------------------------------------- | ----------------------------------- |
| Data access      | Query functions + mutations              | Subscriptions + reducers/procedures                         | Platform-native                     |
| Pagination       | Server-side cursor (`usePaginatedQuery`) | Client-side slicing from subscription cache                 | No LIMIT/OFFSET in subscription SQL |
| IDs              | String `Id<'table'>`                     | `u64` auto-increment                                        | Platform-native                     |
| Auth check       | `getAuthUserId(ctx)`                     | `ctx.sender` Identity                                       | Platform-native                     |
| Return values    | Mutations return values                  | Procedures return, reducers don’t                           | Platform constraint                 |
| Reactivity model | Per-query subscriptions                  | Per-table subscriptions with SQL WHERE                      | Fundamentally different             |
| File storage     | Built-in Convex storage                  | Pre-signed URL via R2/S3 + procedures                       | No built-in file storage            |
| Auth             | @convex-dev/auth (email/password/OAuth)  | SpacetimeAuth (magic link/OAuth only)                       | Google OAuth for demo apps          |
| Presence         | Custom heartbeat + reactive queries      | Table + connect/disconnect lifecycle                        | SpacetimeDB has lifecycle events    |
| Input validation | Zod validators at network boundary       | SpacetimeDB type system (t.\* types validate automatically) | Platform-native                     |

---

## Definition of Done

- [x] `bun fix` passes with zero errors
- [x] `bun test:all` passes (all library + backend + E2E tests)
- [x] All 4 web apps start and render correctly against local Docker SpacetimeDB
- [x] No Convex runtime dependencies remain (Convex code kept as reference only, not
      imported)
- [x] Package publishable to npm as “betterspace”
- [ ] All tests pass identically on Maincloud — zero regressions vs Docker (tested after
      user provides credentials)

---

## Must NOT Have (Guardrails)

- NO reimplementing SpacetimeDB built-in features — if SpacetimeDB provides it natively,
  use it
- NO Swift/mobile/desktop code
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
- NO forcing Convex-shaped API onto SpacetimeDB — where the platform is fundamentally
  different, the API diverges
- NO ESLint rules without SpacetimeDB equivalent — drop unmappable rules instead of
  inventing new ones
- NO full-table subscriptions except for tiny tables (<100 rows) — ALL subscriptions
  MUST use WHERE filters to bound client cache size
- NO devtools panel or schema playground as blocking tasks — stub for compilation only
