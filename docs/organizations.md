# Organizations

`orgTable()` generates reducers for multi-tenant organization management: creating orgs,
managing members, handling invites, and join requests.

## Schema setup

Define your org fields in `t.ts` and wire everything up with `betterspace()`.
`orgTable()` auto-creates the `orgMember`, `orgInvite`, and `orgJoinRequest` sub-tables.

`t.ts`:

```typescript
import { makeOrgScoped } from 'betterspace/schema'
import { object, string } from 'zod/v4'

const org = {
    team: object({
      name: string().min(1),
      slug: string().regex(/^[a-z0-9-]+$/u)
    })
  },
  orgScoped = makeOrgScoped({
    project: object({ description: string().optional(), name: string().min(1) })
  })

export { org, orgScoped }
```

`index.ts`:

```typescript
import { betterspace } from 'betterspace/server'
import { org as orgFields, orgScoped } from '../../t'

export default betterspace(({ orgScopedTable, orgTable }) => ({
  org: orgTable(orgFields.team, { unique: ['slug'] }),
  project: orgScopedTable(orgScoped.project, { cascade: true })
}))
```

`orgTable()` accepts the same field Zod schema you define for the org’s own fields.
System fields (`id`, `updatedAt`, `userId`) are added automatically.
The `unique` option creates a unique index on the given fields.
Pass `cascade: true` on `orgScopedTable` to delete rows when the org is removed.

## Generated reducers

`orgTable()` generates these reducers:

| Reducer                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `create_org`            | Create a new org (caller becomes owner + member) |
| `update_org`            | Update org name/slug/avatar (owner only)         |
| `remove_org`            | Delete org and cascade-delete all resources      |
| `get_org`               | Fetch org by ID                                  |
| `get_org_by_slug`       | Fetch org by slug                                |
| `my_orgs`               | List orgs the caller belongs to                  |
| `add_member`            | Add a user as member (admin only)                |
| `remove_member`         | Remove a member (admin only)                     |
| `set_admin`             | Toggle admin status for a member                 |
| `leave_org`             | Leave an org (cannot leave if sole owner)        |
| `transfer_ownership`    | Transfer ownership to another member             |
| `invite`                | Create an invite link (admin only)               |
| `accept_invite`         | Accept an invite by token                        |
| `revoke_invite`         | Delete an invite (admin only)                    |
| `pending_invites`       | List pending invites for an org                  |
| `request_join`          | Submit a join request                            |
| `approve_join_request`  | Approve a pending join request (admin only)      |
| `reject_join_request`   | Reject a pending join request (admin only)       |
| `pending_join_requests` | List pending join requests for an org            |
| `membership`            | Get caller’s membership in an org                |
| `members`               | List all members of an org                       |

All reducers above are generated with typed signatures and runtime checks for org
permissions, ownership transfers, invites, and join-request workflows.

## orgScopedTable

`orgScopedTable` registers a table that belongs to an org and enforces org membership
before any write. Pass the result of `makeOrgScoped()` from your schema file:

```typescript
import { betterspace } from 'betterspace/server'
import { orgScoped } from '../../t'

export default betterspace(({ orgScopedTable }) => ({
  project: orgScopedTable(orgScoped.project)
}))
```

Generated reducers: `create_project`, `update_project`, `rm_project`.

The `create_project` reducer requires `orgId` in addition to the fields.
It checks that the caller is a member of that org before inserting.

The `update_project` and `rm_project` reducers check that the caller is either:

- An org admin, or
- The original creator of the row (`userId === ctx.sender`)

## Client-side org context

Use `OrgProvider` to make org data available throughout your component tree:

```typescript
// app/org/[slug]/layout.tsx
'use client'

import { OrgProvider } from 'betterspace/react'
import { useTable } from 'spacetimedb/react'
import { tables } from '@/generated/module_bindings'

const OrgLayout = ({
  children,
  orgSlug,
}: {
  children: React.ReactNode
  orgSlug: string
}) => {
  const [orgs] = useTable(tables.org)
  const [members] = useTable(tables.orgMember)

  const org = orgs.find(o => o.slug === orgSlug)
  if (!org) return <div>Org not found</div>

  const myMembership = members.find(
    m => m.orgId === org.id && m.userId === currentIdentity
  )
  const role = org.userId === currentIdentity
    ? 'owner'
    : myMembership?.isAdmin
    ? 'admin'
    : 'member'

  return (
    <OrgProvider org={org} role={role} membership={myMembership ?? null}>
      {children}
    </OrgProvider>
  )
}
```

### Org hooks

```typescript
'use client'

import { useOrg, useActiveOrg, useMyOrgs } from 'betterspace/react'

const OrgHeader = () => {
  const { org, role, isAdmin, isOwner, canManageMembers } = useOrg()
  const { activeOrg, setActiveOrg } = useActiveOrg()
  const { orgs } = useMyOrgs()

  return (
    <header>
      <h1>{org.name}</h1>
      <span>{role}</span>
      {isAdmin && <a href="/members">Manage members</a>}
    </header>
  )
}
```

### Org-scoped mutations

`useOrgMutation` automatically injects `orgId` into reducer calls:

```typescript
'use client'

import { useOrgMutation } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const CreateProject = () => {
  const createProject = useOrgMutation(useReducer(reducers.create_project))

  const handleSubmit = async (name: string) => {
    // orgId is injected automatically from OrgProvider context
    await createProject({ name })
  }
}
```

## Read-side ACL with private tables and views

For data that should only be visible to org members, use private tables with public
views filtered by `ctx.sender`. This is a SpacetimeDB-level feature configured outside
of `betterspace()`:

```sql
CREATE VIEW my_org_data AS
  SELECT d.* FROM private_data d
  JOIN org_member m ON m.org_id = d.org_id
  WHERE m.user_id = ctx_sender()
```

Clients subscribe to the view, not the base table.
SpacetimeDB enforces this at the subscription level.

## canEditResource

For resources with an optional `editors` list (users who can edit even if they’re not
the owner):

```typescript
import { canEditResource } from 'betterspace/react'

const canEdit = canEditResource({
  resource: wiki, // must have userId field
  editorsList: wiki.editors ?? [], // array of { userId }
  isAdmin: org.isAdmin,
  userId: currentIdentity.toHexString()
})
```
