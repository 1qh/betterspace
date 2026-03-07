import { betterspace } from 'betterspace/server'

import { base, children, org as orgFields, orgScoped, owned, singleton } from '../../t'

export default betterspace(
  ({ cacheTable, childTable, fileTable, orgScopedTable, orgTable, ownedTable, singletonTable, t }) => ({
    blog: ownedTable(owned.blog, { index: ['published'], rateLimit: { max: 10, window: 60_000 } }),
    blogProfile: singletonTable(singleton.blogProfile),
    chat: ownedTable(owned.chat, { index: ['isPublic'], rateLimit: { max: 10, window: 60_000 } }),
    file: fileTable(),
    message: childTable(children.message),
    movie: cacheTable('tmdbId', base.movie),
    org: orgTable(orgFields.team, { unique: ['slug'] }),
    orgProfile: singletonTable(singleton.orgProfile),
    project: orgScopedTable(orgScoped.project, {
      cascade: true,
      extra: { editors: t.array(t.identity()).optional() }
    }),
    task: orgScopedTable(orgScoped.task, {
      cascade: true,
      extra: { assigneeId: t.identity().optional(), projectId: t.u32().index() }
    }),
    wiki: orgScopedTable(orgScoped.wiki, {
      cascade: true,
      extra: { deletedAt: t.timestamp().optional(), editors: t.array(t.identity()).optional() },
      indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }],
      softDelete: true
    })
  })
)
