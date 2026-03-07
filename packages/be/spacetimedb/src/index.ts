import { betterspace } from 'betterspace/server'

import { base, children, org, orgScoped, owned, singleton } from '../../t'

export default betterspace(({ t, table }) => ({
  blog: table(owned.blog, { index: ['published'], rateLimit: { max: 10, window: 60_000 } }),
  blogProfile: table(singleton.blogProfile),
  chat: table(owned.chat, { index: ['isPublic'], rateLimit: { max: 10, window: 60_000 } }),
  file: table.file(),
  message: table(children.message),
  movie: table(base.movie, { key: 'tmdbId' }),
  org: table(org.team, { unique: ['slug'] }),
  orgProfile: table(singleton.orgProfile),
  project: table(orgScoped.project, {
    cascade: true,
    extra: { editors: t.array(t.identity()).optional() }
  }),
  task: table(orgScoped.task, {
    cascade: true,
    extra: { assigneeId: t.identity().optional(), projectId: t.u32().index() }
  }),
  wiki: table(orgScoped.wiki, {
    cascade: true,
    extra: { deletedAt: t.timestamp().optional(), editors: t.array(t.identity()).optional() },
    indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }],
    softDelete: true
  })
}))
