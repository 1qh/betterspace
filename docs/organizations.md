# Organizations

The `org()` factory generates reducers for multi-tenant organization management:
creating orgs, managing members, handling invites, and join requests.

## Schema setup

Organizations require several tables.
Define them in your SpacetimeDB module:

```typescript
import { makeOrg, makeOrgCrud } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

const org = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      name: t.string(),
      slug: t.string().unique(),
      avatarId: t.string().optional(),
      updatedAt: t.timestamp(),
      userId: t.identity().index() // owner
    }
  ),
  orgMember = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      userId: t.identity().index(),
      isAdmin: t.bool(),
      updatedAt: t.timestamp()
    }
  ),
  orgInvite = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      email: t.string(),
      token: t.string().unique(),
      isAdmin: t.bool(),
      expiresAt: t.number()
    }
  ),
  orgJoinRequest = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      userId: t.identity().index(),
      status: t.string().index(),
      message: t.string().optional()
    }
  ),
  // Org-scoped resource table
  project = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      name: t.string(),
      description: t.string().optional(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  spacetimedb = schema({
    org,
    orgMember,
    orgInvite,
    orgJoinRequest,
    project
  })
```

## org factory

```typescript
const { org } = setupCrud(spacetimedb, defaults)

const orgFns = org(orgFields.team, {
  cascadeTables: ['task', 'project', 'wiki'],
  t
})
```

`org()` derives all builders, table accessors, and cascade callbacks from the field
definitions automatically.
Pass the org fields object and a list of table names to cascade-delete when an org is
removed.

## Generated reducers

`org()` generates these reducers:

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

## makeOrgCrud factory

For tables that belong to an org, use `makeOrgCrud`. It enforces org membership before
any write:

```typescript
const projectCrud = makeOrgCrud(spacetimedb, {
  expectedUpdatedAtField: t.timestamp(),
  fields: {
    name: t.string(),
    description: t.string().optional()
  },
  idField: t.u32(),
  orgIdField: t.u32(),
  orgMemberTable: db => db.orgMember,
  pk: tbl => tbl.id,
  table: db => db.project,
  tableName: 'project'
})
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
views filtered by `ctx.sender`:

```typescript
// In your SpacetimeDB module
const privateData = table(
  { public: false }, // clients cannot subscribe directly
  {
    id: t.u32().autoInc().primaryKey(),
    orgId: t.u32().index(),
    content: t.string(),
    userId: t.identity().index()
  }
)

// Define a view that filters by org membership
// (View SQL defined separately in your module)
// CREATE VIEW my_org_data AS
//   SELECT d.* FROM private_data d
//   JOIN org_member m ON m.org_id = d.org_id
//   WHERE m.user_id = ctx_sender()
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
