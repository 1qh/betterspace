import { owned } from '../../t'
import { crud as makeCrud } from './lazy'

const blogCrud = makeCrud('blog', owned.blog)

export { blogCrud }
