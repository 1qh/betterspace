import { t } from 'spacetimedb/server'

import { base, children, orgScoped, owned, singleton } from '../../t'
import { allExports, cacheCrud, childCrud, crud, fileUpload, orgCrud, singletonCrud } from './lazy'
import spacetimedb from './tables'

const blog = crud('blog', owned.blog, { rateLimit: { max: 10, window: 60_000 } }),
  chat = crud('chat', owned.chat, { rateLimit: { max: 10, window: 60_000 } }),
  message = childCrud('message', { foreignKey: 'chatId', table: 'chat' }, children.message.schema),
  movie = cacheCrud('movie', 'tmdbId', base.movie),
  project = orgCrud('project', orgScoped.project),
  task = orgCrud('task', orgScoped.task),
  wiki = orgCrud('wiki', orgScoped.wiki, { softDelete: true }),
  blogProfile = singletonCrud('blogProfile', singleton.blogProfile),
  orgProfile = singletonCrud('orgProfile', singleton.orgProfile),
  file = fileUpload('file', 'file', {
    contentType: t.string(),
    filename: t.string(),
    size: t.number(),
    storageKey: t.string()
  }),
  modules = [blog, chat, file, message, movie, project, task, wiki, blogProfile, orgProfile],
  reducers = spacetimedb.exportGroup(allExports())

if (modules.length === 0) throw new Error('No modules registered')

export { reducers }
export default spacetimedb
