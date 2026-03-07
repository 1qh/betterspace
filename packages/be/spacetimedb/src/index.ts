import { makeSchema, setupCrud } from 'betterspace/server'

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
    schema,
    singletonTable,
    t
  } = makeSchema(),
  spacetimedb = schema({
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
  }),
  { allExports, cacheCrud, childCrud, crud, fileUpload, m, org, orgCrud, register, singletonCrud } =
    setupCrud(spacetimedb),
  orgFns = org(orgFields.team, { cascadeTables: ['task', 'project', 'wiki'] })

crud('blog', owned.blog, { rateLimit: { max: 10, window: 60_000 } })
crud('chat', owned.chat, { rateLimit: { max: 10, window: 60_000 } })
childCrud('message', { foreignKey: 'chatId', table: 'chat' }, children.message.schema)
cacheCrud('movie', 'tmdbId', base.movie)
orgCrud('project', orgScoped.project)
orgCrud('task', orgScoped.task)
orgCrud('wiki', orgScoped.wiki, { softDelete: true })
singletonCrud('blogProfile', singleton.blogProfile)
singletonCrud('orgProfile', singleton.orgProfile)
fileUpload('file')

const reducers = spacetimedb.exportGroup(allExports())

export { allExports, cacheCrud, childCrud, crud, fileUpload, m, org, orgCrud, orgFns, reducers, register, singletonCrud }
export default spacetimedb
