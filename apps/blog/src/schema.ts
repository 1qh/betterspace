import { owned, singleton } from '@a/be/t'
import { zodFromTable } from 'betterspace'

const createBlog = zodFromTable(owned.blog, { exclude: ['published'] }),
  editBlog = zodFromTable(owned.blog).partial(),
  profileSchema = zodFromTable(singleton.blogProfile)

export { createBlog, editBlog, profileSchema }
