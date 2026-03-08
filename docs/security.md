# Security & Scalability

## Row-Level Security (RLS)

betterspace auto-generates server-enforced `clientVisibilityFilter` rules from the `pub`
option on each table.
These rules run inside SpacetimeDB — clients cannot bypass or modify them.

The `:sender` token in each rule is the connected client’s cryptographic Identity,
injected server-side.
It cannot be spoofed.

### How `pub` Maps to RLS

| Consumer config                | Generated filter                                                     |
| ------------------------------ | -------------------------------------------------------------------- |
| `pub: true`                    | No filter — table is fully public                                    |
| `pub: 'published'`             | `WHERE published = true OR userId = :sender`                         |
| No `pub` (owned)               | `WHERE userId = :sender`                                             |
| No `pub` (file)                | `WHERE userId = :sender`                                             |
| No `pub` (singleton)           | `WHERE userId = :sender` — per-user isolation                        |
| No `pub` (orgScoped)           | `JOIN orgMember ON orgId WHERE orgMember.userId = :sender`           |
| `base` / `cache`               | No filter — cache tables are public by design                        |
| Children (parent has `pub`)    | `JOIN parent ON fk WHERE parent.pubField = true OR userId = :sender` |
| Children (parent fully public) | No filter — inherits parent’s public visibility                      |
| Children (parent no `pub`)     | `WHERE userId = :sender`                                             |

Multiple RLS rules on the same table are OR’d by SpacetimeDB.

### Children RLS Inheritance

Children tables automatically inherit their parent’s `pub` visibility.
When the parent has `pub: 'isPublic'`, child rows are visible if the parent’s pub field
is true OR the child row’s owner matches the caller:

```sql
SELECT "message".* FROM "message"
JOIN "chat" ON "message"."chatId" = "chat"."id"
WHERE "chat"."isPublic" = true OR "message"."userId" = :sender
```

Uses `JOIN` so child visibility is always derived from the parent.
Messages in a public chat are visible to everyone, while messages in a private chat are
only visible to the message sender.
If the parent is deleted, child rows become invisible through this policy (SpacetimeDB
only supports inner joins in RLS).

### Auto-Indexed pub Fields

When `pub: 'fieldName'` is specified, betterspace automatically creates an index on that
field. No need to specify both `pub` and `index` for the same field:

```tsx
blog: table(s.blog, { pub: 'published' })
```

### Example

```tsx
export default betterspace(({ table }) => ({
  blog: table(s.blog, { pub: 'published' }),
  chat: table(s.chat, { pub: 'isPublic' }),
  message: table(s.message),
  movie: table(s.movie, { key: 'tmdbId' }),
  project: table(s.project),
  wiki: table(s.wiki, { softDelete: true }),
  file: table.file()
}))
```

This generates:

- `blog`: clients see published posts OR their own drafts (`published` auto-indexed)
- `chat`: clients see public chats OR their own private chats (`isPublic` auto-indexed)
- `message`: children of `chat` — inherits chat’s RLS (visible if chat is public OR own
  message)
- `movie`: cache table — no RLS (public data)
- `project`: orgScoped — clients see projects only in orgs they belong to
  (cascade-deletes by default)
- `wiki`: orgScoped — same org-membership check (cascade-deletes by default)
- `file`: clients see only their own uploaded files

The auto-generated RLS rules push to SpacetimeDB’s `moduleDef.rowLevelSecurity`. No
manual SQL is needed.

## Write-Side Access Control

All generated CRUD reducers enforce access control via `ctx.sender`:

### Ownership Checks

| Table type  | Who can create         | Who can update/delete     |
| ----------- | ---------------------- | ------------------------- |
| `owned`     | Any authenticated user | Row owner only            |
| `orgScoped` | Org members only       | Row owner or org admin    |
| `children`  | Parent row owner only  | Parent row owner only     |
| `singleton` | Any authenticated user | Owner only (1:1 per user) |
| `base`      | Server-side only       | Server-side only          |
| `file`      | Any authenticated user | File owner only           |

### Input Validation

Every mutation validates input against the Zod schema before any database write.
Invalid input is rejected with a `VALIDATION_FAILED` error code and field-level error
details.

```tsx
const s = schema({
  owned: {
    blog: object({
      title: string().min(1, 'Required'),
      content: string().min(3),
      category: zenum(['tech', 'life', 'tutorial']),
      published: boolean()
    })
  }
})
```

A `createBlog({ title: '', content: 'x', category: 'invalid' })` call fails with:

```json
{
  "code": "VALIDATION_FAILED",
  "message": "title: Required; content: At least 3 characters; category: Invalid enum value"
}
```

### Conflict Detection

Update reducers accept an `expectedUpdatedAt` parameter.
If the row was modified since the client last read it, the update is rejected with a
`CONFLICT` error. This prevents lost-update races in collaborative editing.

### Rate Limiting

```tsx
blog: table(s.blog, { rateLimit: 10 })
blog: table(s.blog, { rateLimit: { max: 10, window: 30_000 } })
```

A number means “max N per minute” (60s window).
Pass an object for custom windows.
Exceeding the limit returns `RATE_LIMITED` with a `retryAfter` value in milliseconds.

## Org ACL (Access Control Lists)

### Roles

| Role     | Permissions                                                           |
| -------- | --------------------------------------------------------------------- |
| `owner`  | All permissions. Transfer ownership. Manage admins. Delete org.       |
| `admin`  | Manage members. Invite/remove. Approve join requests. CRUD resources. |
| `member` | CRUD own resources within the org. Leave org.                         |

### Membership Flow

- **Invite**: admin/owner sends invite by email → recipient accepts with token
- **Join request**: user requests to join → admin/owner approves or rejects
- **Leave**: any member can leave (except sole owner)
- **Remove**: admin can remove members, owner can remove admins

### Editor ACL

For per-item permissions beyond role-based access:

```tsx
wiki: table(s.wiki, {
  extra: { editors: t.array(t.identity()).optional() },
  softDelete: true
})
```

The `editors` field stores Identity arrays.
Consumer code checks `canEditResource(resource, org)` to gate UI and server-side logic.

### Cascade Delete

Org-scoped tables cascade-delete by default when an org is deleted.
All rows belonging to the deleted org are automatically removed.
Opt out with `cascade: false` if needed:

```tsx
project: table(s.project, { cascade: false })
```

## Scalability Architecture

betterspace is built on SpacetimeDB, an in-memory real-time database designed for MMO
game servers. BitCraft, a massively multiplayer game, runs its entire backend — chat,
items, terrain, millions of entities — on a single SpacetimeDB instance, handling tens
of thousands of concurrent players.

A SaaS application with filtered subscriptions and bounded working sets is significantly
simpler than an MMO.

### How Data Flows

Traditional databases use request-response: client requests page N, server queries,
returns 20 rows, data goes stale immediately.

SpacetimeDB uses subscriptions: client subscribes to a bounded view, server pushes
matching rows, updates stream in real-time.
Data is always live.

There is no polling, no cache invalidation, no stale data.

### Scaling Numbers

A single SpacetimeDB instance on 512GB RAM handles:

| Metric                | Capacity                           |
| --------------------- | ---------------------------------- |
| Registered users      | 100M+                              |
| Concurrent users (1%) | 1M                                 |
| Active data (30 days) | ~350GB                             |
| Write throughput      | 100K+ TPS                          |
| Per-client row count  | ~200 rows (bounded by RLS + views) |

Multi-instance sharding is only needed at genuine internet-giant scale (billions of
users). For startup-to-unicorn growth, a single instance suffices.

### The Chunk Pattern

SpacetimeDB subscriptions do not support `LIMIT`, `OFFSET`, or `ORDER BY`. This is
intentional — not a missing feature.

An MMO does not paginate entities.
Each player subscribes to their chunk (nearby entities).
As they move, they subscribe to the new chunk and unsubscribe the old one.

The same pattern applies to any application:

| MMO concept      | App equivalent                                    |
| ---------------- | ------------------------------------------------- |
| Spatial chunk    | Time window (last 24h, last 7d)                   |
| Entities near me | Posts from my orgs / tasks in my project          |
| Chunk loading    | Subscribe to next time window on scroll           |
| Chunk unloading  | Unsubscribe from old window to free client memory |

In practice:

1. View subscribes to “recent posts, last 24h” → 200 posts
2. `useList` or `useInfiniteList` paginates client-side (show 20, scroll for more)
3. User scrolls past 200 → subscribe to next window (1-7 days ago)
4. Old window unsubscribes → client memory stays bounded
5. Data older than 30 days → fetch from cold storage via procedure

### Data Lifecycle

SpacetimeDB holds all data in RAM. Tables must stay bounded:

- **TTL**: scheduled reducers hard-delete data older than N days
- **Archive**: move cold data to external storage (S3/Postgres) before deletion
- **Soft delete**: `deletedAt` column with grace period before hard delete

Hot data (last 30 days) stays in SpacetimeDB for real-time access.
Cold data (older) moves to external storage for historical queries.

### Runtime Safeguards

`warnLargeFilterSet` (from `betterspace/server`) warns or throws when client-side
filtering exceeds a threshold (default: 1000 rows).
Use it in subscription handlers to catch unbounded data patterns during development:

```tsx
import { warnLargeFilterSet } from 'betterspace/server'

warnLargeFilterSet({ count: rows.length, table: 'posts', context: 'home-feed' })
warnLargeFilterSet({
  count: rows.length,
  table: 'posts',
  context: 'home-feed',
  strict: true
})
```

Pass `strict: true` for strict mode (throws instead of warns).

### Anti-Patterns

- Subscribing to entire large tables without WHERE or view filtering
- Storing unbounded historical data without TTL — tables grow forever, RAM runs out
- Using procedures for data the client needs in real-time — use subscriptions
- Thinking in REST pagination mental model — think in subscription windows/chunks

### When External Services Are Needed

SpacetimeDB handles real-time data.
At scale, these features need external services:

| Need                                | Service                 |
| ----------------------------------- | ----------------------- |
| Full-text search across all content | Meilisearch / Typesense |
| Cross-instance aggregation          | Redis + worker          |
| Analytics / reporting               | ClickHouse / BigQuery   |
| Cold storage for archived data      | S3 / Postgres           |

These are at-scale optimizations, not day-one requirements.
Start with a single SpacetimeDB instance and add external services when you actually
need them.

## Error Handling

All betterspace errors use discriminated error codes:

| Code                | Meaning                                                      |
| ------------------- | ------------------------------------------------------------ |
| `NOT_AUTHENTICATED` | No `ctx.sender` — client not connected                       |
| `NOT_FOUND`         | Row does not exist or caller lacks access                    |
| `FORBIDDEN`         | Caller lacks permission (non-owner write, insufficient role) |
| `NOT_AUTHORIZED`    | Caller is not authorized to access the resource              |
| `VALIDATION_FAILED` | Input failed Zod validation — includes field-level errors    |
| `CONFLICT`          | Row was modified since `expectedUpdatedAt`                   |
| `RATE_LIMITED`      | Too many mutations — includes `retryAfter` (ms)              |
| `DUPLICATE`         | Unique constraint violation                                  |

Errors include structured `ErrorData`:

```tsx
interface ErrorData {
  code: ErrorCode
  message: string
  detail?: Record<string, string>
  retryAfter?: number
}
```

On the client, `useMut` and `useFormMutation` automatically parse these errors and
surface them as toasts or field-level validation messages.
