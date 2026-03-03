import { t } from 'spacetimedb/server'

const file = t.string(),
  files = t.array(t.string()),
  messagePart = t.object('MessagePartSchema', {
    file: t.string().optional(),
    image: t.string().optional(),
    name: t.string().optional(),
    text: t.string().optional(),
    type: t.string()
  }),
  owned = {
    blog: {
      attachments: files.optional(),
      category: t.string(),
      content: t.string(),
      coverImage: file.optional(),
      published: t.bool(),
      tags: t.array(t.string()).optional(),
      title: t.string()
    },
    chat: {
      isPublic: t.bool(),
      title: t.string()
    }
  },
  children = {
    message: {
      foreignKey: 'chatId',
      schema: {
        chatId: t.u32(),
        parts: t.array(messagePart),
        role: t.string()
      }
    }
  },
  base = {
    movie: {
      backdropPath: t.string().optional(),
      budget: t.number().optional(),
      genres: t.array(
        t.object('MovieGenreSchema', {
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
      tmdbId: t.number(),
      voteAverage: t.number(),
      voteCount: t.number()
    }
  },
  org = {
    team: {
      avatarId: t.string().optional(),
      name: t.string(),
      slug: t.string()
    }
  },
  orgScoped = {
    project: {
      description: t.string().optional(),
      editors: t.array(t.identity()).optional(),
      name: t.string(),
      status: t.string().optional()
    },
    task: {
      assigneeId: t.identity().optional(),
      completed: t.bool().optional(),
      priority: t.string().optional(),
      projectId: t.u32(),
      title: t.string()
    },
    wiki: {
      content: t.string().optional(),
      deletedAt: t.timestamp().optional(),
      editors: t.array(t.identity()).optional(),
      slug: t.string(),
      status: t.string(),
      title: t.string()
    }
  },
  profileShape = {
    avatar: file.optional(),
    bio: t.string().optional(),
    displayName: t.string(),
    notifications: t.bool(),
    theme: t.string()
  },
  singleton = {
    blogProfile: profileShape,
    orgProfile: profileShape
  }

export { base, children, org, orgScoped, owned, singleton }
