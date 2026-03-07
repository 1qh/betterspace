import { betterspace } from 'betterspace/server'

import { s } from '../t'

export default betterspace(({ t, table }) => ({
  blog: table(s.blog, { index: ['published'], pub: 'published', rateLimit: { max: 10, window: 60_000 } }),
  blogProfile: table(s.blogProfile),
  chat: table(s.chat, { index: ['isPublic'], pub: 'isPublic', rateLimit: { max: 10, window: 60_000 } }),
  file: table.file(),
  message: table(s.message),
  movie: table(s.movie, { key: 'tmdbId' }),
  org: table(s.team, { unique: ['slug'] }),
  orgProfile: table(s.orgProfile),
  project: table(s.project, {
    cascade: true,
    extra: { editors: t.array(t.identity()).optional() }
  }),
  task: table(s.task, {
    cascade: true,
    extra: { assigneeId: t.identity().optional(), projectId: t.u32().index() }
  }),
  wiki: table(s.wiki, {
    cascade: true,
    compoundIndex: ['orgId', 'slug'],
    extra: { editors: t.array(t.identity()).optional() },
    softDelete: true
  })
}))
