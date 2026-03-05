import { makeSchema } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

import { org as orgFields, orgScoped, owned, singleton } from '../../t'

const { childTable, orgScopedTable, ownedTable, singletonTable } = makeSchema({ t, table }),
  messagePart = t.object('MessagePart', {
    file: t.string().optional(),
    image: t.string().optional(),
    name: t.string().optional(),
    text: t.string().optional(),
    type: t.string()
  }),
  movieGenre = t.object('MovieGenre', { id: t.number(), name: t.string() }),
  blog = ownedTable(owned.blog, { published: t.bool().index() }),
  chat = ownedTable(owned.chat, { isPublic: t.bool().index() }),
  message = childTable('chatId', { parts: t.array(messagePart), role: t.string() }),
  movie = table(
    { public: true },
    {
      backdropPath: t.string().optional(),
      budget: t.number().optional(),
      cachedAt: t.timestamp(),
      genres: t.array(movieGenre),
      id: t.u32().autoInc().primaryKey(),
      invalidatedAt: t.timestamp().optional(),
      originalTitle: t.string(),
      overview: t.string(),
      posterPath: t.string().optional(),
      releaseDate: t.string(),
      revenue: t.number().optional(),
      runtime: t.number().optional(),
      tagline: t.string().optional(),
      title: t.string(),
      tmdbId: t.u32().unique(),
      updatedAt: t.timestamp(),
      voteAverage: t.number(),
      voteCount: t.number()
    }
  ),
  blogProfile = singletonTable(singleton.blogProfile),
  orgProfile = singletonTable(singleton.orgProfile),
  org = ownedTable(orgFields.team, { slug: t.string().unique() }),
  orgMember = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      isAdmin: t.bool(),
      orgId: t.u32().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  orgInvite = table(
    { public: true },
    {
      email: t.string(),
      expiresAt: t.number(),
      id: t.u32().autoInc().primaryKey(),
      isAdmin: t.bool(),
      orgId: t.u32().index(),
      token: t.string().unique()
    }
  ),
  orgJoinRequest = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      message: t.string().optional(),
      orgId: t.u32().index(),
      status: t.string().index(),
      userId: t.identity().index()
    }
  ),
  project = orgScopedTable(orgScoped.project),
  task = orgScopedTable(orgScoped.task, { projectId: t.u32().index() }),
  wiki = orgScopedTable(orgScoped.wiki, undefined, {
    indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }]
  }),
  file = table(
    { public: true },
    {
      contentType: t.string(),
      filename: t.string(),
      id: t.u32().autoInc().primaryKey(),
      size: t.number(),
      storageKey: t.string(),
      uploadedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  spacetimedb = schema({
    blog,
    blogProfile,
    chat,
    file,
    message,
    movie,
    org,
    orgInvite,
    orgJoinRequest,
    orgMember,
    orgProfile,
    project,
    task,
    wiki
  })

export default spacetimedb
export {
  blog,
  blogProfile,
  chat,
  file,
  message,
  messagePart,
  movie,
  movieGenre,
  org,
  orgInvite,
  orgJoinRequest,
  orgMember,
  orgProfile,
  project,
  task,
  wiki
}
