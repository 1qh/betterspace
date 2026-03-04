import { org, orgScoped, singleton } from '@a/be/z'
import { cvFile } from 'betterspace/schema'
import { schemaVariants } from 'betterspace/zod'
import { boolean, email, object, string } from 'zod/v4'

const orgTeamSchema = org.team.omit({ avatarId: true }),
  wikiSchema = orgScoped.wiki.omit({ content: true }).extend({ content: string().optional() }),
  orgTeamVariants = schemaVariants(orgTeamSchema, ['name', 'slug']),
  projectVariants = schemaVariants(orgScoped.project, ['name']),
  wikiVariants = schemaVariants(wikiSchema, ['slug', 'status', 'title']),
  orgTeam = orgTeamVariants.create,
  orgTeamUpdate = orgTeamVariants.update,
  project = projectVariants.create,
  projectUpdate = projectVariants.update,
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
  wiki = wikiVariants.create,
  wikiUpdate = wikiVariants.update,
  preferencesStep = singleton.orgProfile.pick({ notifications: true, theme: true })

export {
  appearanceStep,
  invite,
  joinRequest,
  orgStep,
  orgTeam,
  orgTeamUpdate,
  preferencesStep,
  profileStep,
  project,
  projectUpdate,
  wiki,
  wikiUpdate
}
