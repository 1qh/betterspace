import { org, orgScoped, singleton } from '@a/be/z'
import { cvFile } from 'betterspace/schema'
import { boolean, email, object, string } from 'zod/v4'

const { team } = org,
  { project: projectSchema, wiki: wikiSchema } = orgScoped,
  orgTeam = team.omit({ avatarId: true }),
  project = projectSchema,
  wiki = wikiSchema.omit({ content: true }).extend({ content: string().optional() }),
  invite = object({ email: email(), isAdmin: boolean() }),
  joinRequest = object({ message: string().optional() }),
  profileStep = singleton.orgProfile.pick({ avatar: true, bio: true, displayName: true }),
  orgStep = object({
    name: string().min(1),
    slug: string()
      .min(1)
      .regex(/^[a-z0-9-]+$/u)
  }),
  appearanceStep = object({
    orgAvatar: cvFile().nullable().optional()
  }),
  preferencesStep = singleton.orgProfile.pick({ notifications: true, theme: true })

export { appearanceStep, invite, joinRequest, orgStep, orgTeam, preferencesStep, profileStep, project, wiki }
