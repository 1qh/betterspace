import { makeSchema } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

import { base, children, org as orgFields, orgScoped, owned, singleton } from '../../t'

const {
    cacheTable,
    childTable,
    fileTable,
    orgInviteTable,
    orgJoinRequestTable,
    orgMemberTable,
    orgScopedTable,
    ownedTable,
    singletonTable
  } = makeSchema({ t, table }),
  blog = ownedTable(owned.blog, { published: t.bool().index() }),
  blogProfile = singletonTable(singleton.blogProfile),
  chat = ownedTable(owned.chat, { isPublic: t.bool().index() }),
  file = fileTable(),
  message = childTable('chatId', children.message.schema),
  movie = cacheTable({ builder: t.u32().unique(), name: 'tmdbId' }, base.movie),
  org = ownedTable(orgFields.team, { slug: t.string().unique() }),
  orgInvite = orgInviteTable(),
  orgJoinRequest = orgJoinRequestTable(),
  orgMember = orgMemberTable(),
  orgProfile = singletonTable(singleton.orgProfile),
  project = orgScopedTable(orgScoped.project, { editors: t.array(t.identity()).optional() }),
  task = orgScopedTable(orgScoped.task, { assigneeId: t.identity().optional(), projectId: t.u32().index() }),
  wiki = orgScopedTable(
    orgScoped.wiki,
    { deletedAt: t.timestamp().optional(), editors: t.array(t.identity()).optional() },
    {
      indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }]
    }
  ),
  spacetimedb = schema({
    blog,
    blogProfile,
    chat,
    file,
    message,
    movie,
    org,
    orgInvite,
    orgJoinRequest,
    orgMember,
    orgProfile,
    project,
    task,
    wiki
  })

export default spacetimedb
export {
  blog,
  blogProfile,
  chat,
  file,
  message,
  movie,
  org,
  orgInvite,
  orgJoinRequest,
  orgMember,
  orgProfile,
  project,
  task,
  wiki
}
