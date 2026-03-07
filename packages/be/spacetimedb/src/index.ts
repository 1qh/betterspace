import { setupCrud } from 'betterspace/server'

import { base, children, org as orgFields, orgScoped, owned, singleton } from '../../t'
import spacetimedb from './tables'

const { allExports, cacheCrud, childCrud, crud, fileUpload, m, org, orgCrud, register, singletonCrud } =
    setupCrud(spacetimedb),
  orgFns = org(orgFields.team, {
    cascadeTables: ['task', 'project', 'wiki']
  })

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
