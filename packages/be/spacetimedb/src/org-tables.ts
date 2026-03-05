import { orgScoped } from '../../t'
import { orgCrud as makeOrgCrud } from './lazy'

const projectCrud = makeOrgCrud('project', orgScoped.project),
  taskCrud = makeOrgCrud('task', orgScoped.task),
  wikiCrud = makeOrgCrud('wiki', orgScoped.wiki, { softDelete: true })

export { projectCrud, taskCrud, wikiCrud }
