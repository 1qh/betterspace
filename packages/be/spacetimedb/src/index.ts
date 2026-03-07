import { setupCrud } from 'betterspace/server'

import { base, children, org as orgFields, orgScoped, owned, singleton } from '../../t'
import spacetimedb from './tables'

const { allExports, cacheCrud, childCrud, crud, exports, fileUpload, m, org, orgCrud, register, singletonCrud } =
    setupCrud(spacetimedb),
  orgFns = org(orgFields.team, {
    cascadeTables: ['task', 'project', 'wiki']
  }),
  blog = crud('blog', owned.blog, { rateLimit: { max: 10, window: 60_000 } }),
  chat = crud('chat', owned.chat, { rateLimit: { max: 10, window: 60_000 } }),
  message = childCrud('message', { foreignKey: 'chatId', table: 'chat' }, children.message.schema),
  movie = cacheCrud('movie', 'tmdbId', base.movie),
  project = orgCrud('project', orgScoped.project),
  task = orgCrud('task', orgScoped.task),
  wiki = orgCrud('wiki', orgScoped.wiki, { softDelete: true }),
  blogProfile = singletonCrud('blogProfile', singleton.blogProfile),
  orgProfile = singletonCrud('orgProfile', singleton.orgProfile),
  file = fileUpload('file'),
  modules = [blog, chat, file, message, movie, project, task, wiki, blogProfile, orgProfile],
  reducers = spacetimedb.exportGroup(allExports())

if (modules.length === 0) throw new Error('No modules registered')

export {
  allExports,
  cacheCrud,
  childCrud,
  crud,
  exports,
  fileUpload,
  m,
  org,
  orgCrud,
  orgFns,
  reducers,
  register,
  singletonCrud
}
export default spacetimedb
