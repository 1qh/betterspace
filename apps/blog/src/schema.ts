import { owned, singleton } from '@a/be/z'

const createBlog = owned.blog.omit({ published: true }),
  editBlog = owned.blog.partial(),
  profileSchema = singleton.blogProfile

export { createBlog, editBlog, profileSchema }
