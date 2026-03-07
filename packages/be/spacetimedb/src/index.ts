import { betterspace } from 'betterspace/server'

import { base, children, org as orgFields, orgScoped, owned, singleton } from '../../t'

export default betterspace({
  crud: { base, children, file: true, orgScoped, owned, singleton },
  options: {
    blog: { rateLimit: { max: 10, window: 60_000 } },
    chat: { rateLimit: { max: 10, window: 60_000 } },
    movie: { key: 'tmdbId' },
    wiki: { softDelete: true }
  },
  org: { cascadeTables: ['task', 'project', 'wiki'], fields: orgFields.team },
  tables: ({
    cacheTable,
    childTable,
    fileTable,
    orgInviteTable,
    orgJoinRequestTable,
    orgMemberTable,
    orgScopedTable,
    ownedTable,
    singletonTable,
    t
  }) => ({
    blog: ownedTable(owned.blog, { published: t.bool().index() }),
    blogProfile: singletonTable(singleton.blogProfile),
    chat: ownedTable(owned.chat, { isPublic: t.bool().index() }),
    file: fileTable(),
    message: childTable('chatId', children.message.schema),
    movie: cacheTable({ builder: t.u32().unique(), name: 'tmdbId' }, base.movie),
    org: ownedTable(orgFields.team, { slug: t.string().unique() }),
    orgInvite: orgInviteTable(),
    orgJoinRequest: orgJoinRequestTable(),
    orgMember: orgMemberTable(),
    orgProfile: singletonTable(singleton.orgProfile),
    project: orgScopedTable(orgScoped.project, { editors: t.array(t.identity()).optional() }),
    task: orgScopedTable(orgScoped.task, { assigneeId: t.identity().optional(), projectId: t.u32().index() }),
    wiki: orgScopedTable(
      orgScoped.wiki,
      { deletedAt: t.timestamp().optional(), editors: t.array(t.identity()).optional() },
      { indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }] }
    )
  })
})
