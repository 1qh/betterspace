import { betterspace } from 'betterspace/server'

import { base, children, org as orgFields, orgScoped, owned, singleton } from '../../t'

export default betterspace(
  ({ cacheTable, childTable, fileTable, orgScopedTable, orgTable, ownedTable, singletonTable, t }) => ({
    blog: ownedTable(owned.blog, { published: t.bool().index() }, { rateLimit: { max: 10, window: 60_000 } }),
    blogProfile: singletonTable(singleton.blogProfile),
    chat: ownedTable(owned.chat, { isPublic: t.bool().index() }, { rateLimit: { max: 10, window: 60_000 } }),
    file: fileTable(),
    message: childTable(children.message),
    movie: cacheTable({ builder: t.u32().unique(), name: 'tmdbId' }, base.movie),
    org: orgTable(orgFields.team, { slug: t.string().unique() }),
    orgProfile: singletonTable(singleton.orgProfile),
    project: orgScopedTable(orgScoped.project, { editors: t.array(t.identity()).optional() }, { cascade: true }),
    task: orgScopedTable(
      orgScoped.task,
      { assigneeId: t.identity().optional(), projectId: t.u32().index() },
      { cascade: true }
    ),
    wiki: orgScopedTable(
      orgScoped.wiki,
      { deletedAt: t.timestamp().optional(), editors: t.array(t.identity()).optional() },
      {
        cascade: true,
        indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }],
        softDelete: true
      }
    )
  })
)
