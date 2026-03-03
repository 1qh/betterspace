import { cvFile } from 'betterspace/schema'
import { boolean, email, object, string } from 'zod/v4'

const orgTeam = object({
    name: string(),
    slug: string().regex(/^[a-z0-9-]+$/u)
  }),
  invite = object({ email: email(), isAdmin: boolean() }),
  joinRequest = object({ message: string().optional() }),
  profileStep = object({
    avatar: cvFile().nullable().optional(),
    bio: string().max(500).optional(),
    displayName: string().trim().min(1)
  }),
  orgStep = object({
    name: string().min(1),
    slug: string()
      .min(1)
      .regex(/^[a-z0-9-]+$/u)
  }),
  appearanceStep = object({
    orgAvatar: cvFile().nullable().optional()
  }),
  preferencesStep = object({
    notifications: boolean(),
    theme: string().min(1)
  })

export { appearanceStep, invite, joinRequest, orgStep, orgTeam, preferencesStep, profileStep }
