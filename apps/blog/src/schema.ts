import { owned, singleton } from '@a/be/z'
import { schemaVariants } from 'betterspace/zod'

const blogVariants = schemaVariants(owned.blog),
  createBlog = blogVariants.create.omit({ published: true }),
  editBlog = blogVariants.update,
  profileSchema = singleton.blogProfile

export { createBlog, editBlog, profileSchema }
