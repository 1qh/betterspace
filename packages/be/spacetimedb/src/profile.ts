import { singleton } from '../../t'
import { singletonCrud } from './lazy'

const blogProfileCrud = singletonCrud('blogProfile', singleton.blogProfile),
  orgProfileCrud = singletonCrud('orgProfile', singleton.orgProfile)

export { blogProfileCrud, orgProfileCrud }
