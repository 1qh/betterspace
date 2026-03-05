import { schema, t, table } from 'spacetimedb/server'

import { org as orgFields, orgScoped, owned, singleton } from '../../t'

const messagePart = t.object('MessagePart', {
    file: t.string().optional(),
    image: t.string().optional(),
    name: t.string().optional(),
    text: t.string().optional(),
    type: t.string()
  }),
  movieGenre = t.object('MovieGenre', {
    id: t.number(),
    name: t.string()
  }),
  blog = table(
    { public: true },
    {
      ...owned.blog,
      id: t.u32().autoInc().primaryKey(),
      published: t.bool().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  chat = table(
    { public: true },
    {
      ...owned.chat,
      id: t.u32().autoInc().primaryKey(),
      isPublic: t.bool().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  message = table(
    { public: true },
    {
      chatId: t.u32().index(),
      id: t.u32().autoInc().primaryKey(),
      parts: t.array(messagePart),
      role: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
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
  blogProfile = table(
    { public: true },
    {
      ...singleton.blogProfile,
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  orgProfile = table(
    { public: true },
    {
      ...singleton.orgProfile,
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  org = table(
    { public: true },
    {
      ...orgFields.team,
      id: t.u32().autoInc().primaryKey(),
      slug: t.string().unique(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
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
  project = table(
    { public: true },
    {
      ...orgScoped.project,
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  task = table(
    { public: true },
    {
      ...orgScoped.task,
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      projectId: t.u32().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  wiki = table(
    { indexes: [{ accessor: 'orgIdSlug', algorithm: 'btree' as const, columns: ['orgId', 'slug'] }], public: true },
    {
      ...orgScoped.wiki,
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
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
