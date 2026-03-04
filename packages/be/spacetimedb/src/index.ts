import { makeOrg, makeOrgTables, setupCrud } from 'betterspace/server'
import { schema, t, table } from 'spacetimedb/server'

const messagePart = t.object('MessagePart', {
    file: t.string().optional(),
    image: t.string().optional(),
    name: t.string().optional(),
    text: t.string().optional(),
    type: t.string()
  }),
  blog = table(
    { public: true },
    {
      attachments: t.array(t.string()).optional(),
      category: t.string(),
      content: t.string(),
      coverImage: t.string().optional(),
      id: t.u32().autoInc().primaryKey(),
      published: t.bool().index(),
      tags: t.array(t.string()).optional(),
      title: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  chat = table(
    { public: true },
    {
      id: t.u32().autoInc().primaryKey(),
      isPublic: t.bool().index(),
      title: t.string(),
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
      genres: t.array(
        t.object('MovieGenre', {
          id: t.number(),
          name: t.string()
        })
      ),
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
      avatar: t.string().optional(),
      bio: t.string().optional(),
      displayName: t.string(),
      notifications: t.bool(),
      theme: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  orgProfile = table(
    { public: true },
    {
      avatar: t.string().optional(),
      bio: t.string().optional(),
      displayName: t.string(),
      notifications: t.bool(),
      theme: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  org = table(
    { public: true },
    {
      avatarId: t.string().optional(),
      id: t.u32().autoInc().primaryKey(),
      name: t.string(),
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
      description: t.string().optional(),
      editors: t.array(t.identity()).optional(),
      id: t.u32().autoInc().primaryKey(),
      name: t.string(),
      orgId: t.u32().index(),
      status: t.string().optional(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  task = table(
    { public: true },
    {
      assigneeId: t.identity().optional(),
      completed: t.bool().optional(),
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      priority: t.string().optional(),
      projectId: t.u32().index(),
      title: t.string(),
      updatedAt: t.timestamp(),
      userId: t.identity().index()
    }
  ),
  wiki = table(
    {
      indexes: [
        {
          accessor: 'orgIdSlug',
          algorithm: 'btree',
          columns: ['orgId', 'slug']
        }
      ],
      public: true
    },
    {
      content: t.string().optional(),
      deletedAt: t.timestamp().optional(),
      editors: t.array(t.identity()).optional(),
      id: t.u32().autoInc().primaryKey(),
      orgId: t.u32().index(),
      slug: t.string(),
      status: t.string(),
      title: t.string(),
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
  }),
  { cacheCrud, childCrud, crud, fileUpload, orgCrud, singletonCrud } = setupCrud(spacetimedb, {
    expectedUpdatedAtField: t.timestamp(),
    foreignKeyField: t.u32(),
    idField: t.u32(),
    orgIdField: t.u32()
  }),
  blogCrud = crud('blog', {
    attachments: t.array(t.string()).optional(),
    category: t.string(),
    content: t.string(),
    coverImage: t.string().optional(),
    published: t.bool(),
    tags: t.array(t.string()).optional(),
    title: t.string()
  }),
  chatCrud = crud('chat', {
    isPublic: t.bool(),
    title: t.string()
  }),
  messageCrud = childCrud(
    'message',
    { foreignKey: 'chatId', table: 'chat' },
    {
      parts: t.array(messagePart),
      role: t.string()
    }
  ),
  movieCrud = cacheCrud('movie', 'tmdbId', {
    backdropPath: t.string().optional(),
    budget: t.number().optional(),
    genres: t.array(
      t.object('MovieGenreInput', {
        id: t.number(),
        name: t.string()
      })
    ),
    originalTitle: t.string(),
    overview: t.string(),
    posterPath: t.string().optional(),
    releaseDate: t.string(),
    revenue: t.number().optional(),
    runtime: t.number().optional(),
    tagline: t.string().optional(),
    title: t.string(),
    voteAverage: t.number(),
    voteCount: t.number()
  }),
  blogProfileCrud = singletonCrud('blogProfile', {
    avatar: t.string().optional(),
    bio: t.string().optional(),
    displayName: t.string(),
    notifications: t.bool(),
    theme: t.string()
  }),
  orgProfileCrud = singletonCrud('orgProfile', {
    avatar: t.string().optional(),
    bio: t.string().optional(),
    displayName: t.string(),
    notifications: t.bool(),
    theme: t.string()
  }),
  orgFns = makeOrg(spacetimedb, {
    builders: {
      email: t.string(),
      inviteId: t.u32(),
      isAdmin: t.bool(),
      memberId: t.u32(),
      message: t.string(),
      newOwnerId: t.identity(),
      orgId: t.u32(),
      requestId: t.u32(),
      token: t.string()
    },
    cascadeTables: [
      {
        deleteById: (db, id) => db.task.id.delete(id as number),
        rowsByOrg: (db, orgId) => {
          const rows: { id: unknown }[] = []
          for (const row of db.task.orgId.filter(orgId)) rows.push({ id: row.id })
          return rows
        }
      },
      {
        deleteById: (db, id) => db.project.id.delete(id as number),
        rowsByOrg: (db, orgId) => {
          const rows: { id: unknown }[] = []
          for (const row of db.project.orgId.filter(orgId)) rows.push({ id: row.id })
          return rows
        }
      },
      {
        deleteById: (db, id) => db.wiki.id.delete(id as number),
        rowsByOrg: (db, orgId) => {
          const rows: { id: unknown }[] = []
          for (const row of db.wiki.orgId.filter(orgId)) rows.push({ id: row.id })
          return rows
        }
      }
    ],
    fields: {
      avatarId: t.string().optional(),
      name: t.string(),
      slug: t.string()
    },
    ...makeOrgTables({
      org: db => db.org,
      orgInvite: db => db.orgInvite,
      orgJoinRequest: db => db.orgJoinRequest,
      orgMember: db => db.orgMember
    })
  }),
  projectCrud = orgCrud('project', {
    description: t.string().optional(),
    editors: t.array(t.identity()).optional(),
    name: t.string(),
    status: t.string().optional()
  }),
  taskCrud = orgCrud('task', {
    assigneeId: t.identity().optional(),
    completed: t.bool().optional(),
    priority: t.string().optional(),
    projectId: t.u32(),
    title: t.string()
  }),
  wikiCrud = orgCrud(
    'wiki',
    {
      content: t.string().optional(),
      deletedAt: t.timestamp().optional(),
      editors: t.array(t.identity()).optional(),
      slug: t.string(),
      status: t.string(),
      title: t.string()
    },
    { softDelete: true }
  ),
  fileCrud = fileUpload('file', 'file', {
    contentType: t.string(),
    filename: t.string(),
    size: t.number(),
    storageKey: t.string()
  }),
  reducers = spacetimedb.exportGroup({
    ...blogCrud.exports,
    ...chatCrud.exports,
    ...messageCrud.exports,
    ...movieCrud.exports,
    ...blogProfileCrud.exports,
    ...orgProfileCrud.exports,
    ...orgFns.exports,
    ...projectCrud.exports,
    ...taskCrud.exports,
    ...wikiCrud.exports,
    ...fileCrud.exports
  })

export { reducers }
export default spacetimedb
