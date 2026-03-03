import { cvFile, cvFiles } from 'betterspace/schema'
import { boolean, enum as zenum, object, string } from 'zod/v4'

const createBlog = object({
    attachments: cvFiles().optional(),
    category: string().min(1),
    content: string().min(1),
    coverImage: cvFile().nullable().optional(),
    tags: string().array().optional(),
    title: string().min(1)
  }),
  editBlog = object({
    attachments: cvFiles().optional(),
    category: string().min(1),
    content: string().min(1),
    coverImage: cvFile().nullable().optional(),
    published: boolean(),
    tags: string().array().optional(),
    title: string().min(1)
  }).partial(),
  profileSchema = object({
    avatar: cvFile().nullable().optional(),
    bio: string().optional(),
    displayName: string().min(1),
    notifications: boolean(),
    theme: zenum(['light', 'dark', 'system'])
  })

export { createBlog, editBlog, profileSchema }
