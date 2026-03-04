import { owned, singleton } from '@a/be/z'
import { schemaVariants } from 'betterspace/zod'

type PartialBlog = ReturnType<typeof owned.blog.partial>

const blogVariants = schemaVariants(owned.blog),
  createBlog = blogVariants.create.omit({ published: true }),
  editBlog = blogVariants.update as PartialBlog,
  profileSchema = singleton.blogProfile

export { createBlog, editBlog, profileSchema }
