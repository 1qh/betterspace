# Organizations

The `makeOrg` factory generates reducers for multi-tenant organization management:
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

## makeOrgTables

`makeOrgTables` is a convenience helper that creates all four org tables (`org`,
`orgMember`, `orgInvite`, `orgJoinRequest`) with the standard field layout in one call.

Before:

```typescript
const org = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      name: t.string(),
      slug: t.string().unique(),
      avatarId: t.string().optional(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
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
  )
```

After:

```typescript
import { makeOrgTables } from 'betterspace/server'

const { org, orgMember, orgInvite, orgJoinRequest } = makeOrgTables()
```

Pass the result directly into `schema()`:

```typescript
const spacetimedb = schema({ ...makeOrgTables(), project })
```

* * *

## makeOrg factory

```typescript
const orgFns = makeOrg(spacetimedb, {
  // Fields for creating/updating an org
  fields: {
    name: t.string(),
    slug: t.string(),
    avatarId: t.string().optional()
  },

  // Builder types for reducer parameters
  builders: {
    orgId: t.u32(),
    memberId: t.u32(),
    isAdmin: t.bool(),
    email: t.string(),
    token: t.string(),
    inviteId: t.u32(),
    requestId: t.u32(),
    newOwnerId: t.identity(),
    message: t.string()
  },

  // Table accessors
  orgTable: db => db.org,
  orgPk: tbl => tbl.id,
  orgSlugIndex: tbl => tbl.slug,
  orgByUserIndex: tbl => tbl.userId,

  orgMemberTable: db => db.orgMember,
  orgMemberPk: tbl => tbl.id,
  orgMemberByOrgIndex: tbl => ({
    filterByOrg: orgId => tbl.orgId.filter(orgId),
    [Symbol.iterator]: () => tbl[Symbol.iterator]()
  }),
  orgMemberByUserIndex: tbl => tbl.userId,

  orgInviteTable: db => db.orgInvite,
  orgInvitePk: tbl => tbl.id,
  orgInviteByOrgIndex: tbl => ({
    filterByOrg: orgId => tbl.orgId.filter(orgId),
    [Symbol.iterator]: () => tbl[Symbol.iterator]()
  }),
  orgInviteByTokenIndex: tbl => tbl.token,

  orgJoinRequestTable: db => db.orgJoinRequest,
  orgJoinRequestPk: tbl => tbl.id,
  orgJoinRequestByOrgIndex: tbl => ({
    filterByOrg: orgId => tbl.orgId.filter(orgId),
    [Symbol.iterator]: () => tbl[Symbol.iterator]()
  }),
  orgJoinRequestByOrgStatusIndex: tbl => ({
    filterByOrgStatus: (orgId, status) => {
      const out: unknown[] = []
      for (const row of tbl.orgId.filter(orgId))
        if (row.status === status) out.push(row)
      return out
    },
    [Symbol.iterator]: () => tbl[Symbol.iterator]()
  }),

  // Cascade delete: when an org is deleted, delete its resources
  cascadeTables: [
    {
      rowsByOrg: (db, orgId) => {
        const rows: { id: unknown }[] = []
        for (const row of db.project.orgId.filter(orgId))
          rows.push({ id: row.id })
        return rows
      },
      deleteById: (db, id) => db.project.id.delete(id as number)
    }
  ]
})
```

## Generated reducers

`makeOrg` generates these reducers:

| Reducer | Description |
| --- | --- |
| `create_org` | Create a new org (caller becomes owner + member) |
| `update_org` | Update org name/slug/avatar (owner only) |
| `remove_org` | Delete org and cascade-delete all resources |
| `get_org` | Fetch org by ID |
| `get_org_by_slug` | Fetch org by slug |
| `my_orgs` | List orgs the caller belongs to |
| `add_member` | Add a user as member (admin only) |
| `remove_member` | Remove a member (admin only) |
| `set_admin` | Toggle admin status for a member |
| `leave_org` | Leave an org (cannot leave if sole owner) |
| `transfer_ownership` | Transfer ownership to another member |
| `invite` | Create an invite link (admin only) |
| `accept_invite` | Accept an invite by token |
| `revoke_invite` | Delete an invite (admin only) |
| `pending_invites` | List pending invites for an org |
| `request_join` | Submit a join request |
| `approve_join_request` | Approve a pending join request (admin only) |
| `reject_join_request` | Reject a pending join request (admin only) |
| `pending_join_requests` | List pending join requests for an org |
| `membership` | Get caller’s membership in an org |
| `members` | List all members of an org |

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

### Org-scoped queries

`useOrgQuery` automatically injects `orgId` into query arguments:

```typescript
'use client'

import { useOrgQuery } from 'betterspace/react'

const ProjectList = () => {
  const projects = useOrgQuery(queryProject, { status: 'active' })
  // Calls queryProject({ status: 'active', orgId: '<current-org-id>' })
}
```

Pass `'skip'` to skip the query (e.g. when required data isn’t ready):

```typescript
const details = useOrgQuery(
  queryProject,
  selectedId ? { id: selectedId } : 'skip'
)
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
