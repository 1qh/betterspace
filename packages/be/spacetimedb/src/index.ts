import { blogCrud } from './blog'
import { chatCrud } from './chat'
import { fileCrud } from './file-upload'
import { allExports } from './lazy'
import { messageCrud } from './message'
import { movieCrud } from './movie'
import { projectCrud, taskCrud, wikiCrud } from './org-tables'
import { blogProfileCrud, orgProfileCrud } from './profile'
import spacetimedb from './tables'

const modules = [
    blogCrud,
    chatCrud,
    fileCrud,
    messageCrud,
    movieCrud,
    projectCrud,
    taskCrud,
    wikiCrud,
    blogProfileCrud,
    orgProfileCrud
  ],
  reducers = spacetimedb.exportGroup(allExports())

if (modules.length === 0) throw new Error('No modules registered')

export { reducers }
export default spacetimedb
