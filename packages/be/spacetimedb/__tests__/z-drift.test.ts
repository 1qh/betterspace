import { describe, expect, test } from 'bun:test'
import { base, org, orgScoped, owned, singleton } from '@a/be/z'

const s = (o: Record<string, unknown>) => Object.keys(o).sort()

describe('z.ts ↔ t.ts drift detection', () => {
  test('owned.blog fields match t.ts', () => {
    expect(s(owned.blog.shape)).toEqual(['attachments', 'category', 'content', 'coverImage', 'published', 'tags', 'title'])
  })

  test('owned.chat fields match t.ts', () => {
    expect(s(owned.chat.shape)).toEqual(['isPublic', 'title'])
  })

  test('org.team fields match t.ts', () => {
    expect(s(org.team.shape)).toEqual(['avatarId', 'name', 'slug'])
  })

  test('singleton profile fields match t.ts', () => {
    expect(s(singleton.blogProfile.shape)).toEqual(['avatar', 'bio', 'displayName', 'notifications', 'theme'])
    expect(s(singleton.orgProfile.shape)).toEqual(['avatar', 'bio', 'displayName', 'notifications', 'theme'])
  })

  test('orgScoped.project user fields match t.ts (excludes editors)', () => {
    expect(s(orgScoped.project.shape)).toEqual(['description', 'name', 'status'])
  })

  test('orgScoped.task user fields match t.ts (excludes assigneeId, projectId)', () => {
    expect(s(orgScoped.task.shape)).toEqual(['completed', 'priority', 'title'])
  })

  test('orgScoped.wiki user fields match t.ts (excludes deletedAt, editors)', () => {
    expect(s(orgScoped.wiki.shape)).toEqual(['content', 'slug', 'status', 'title'])
  })

  test('base.movie fields match t.ts', () => {
    expect(s(base.movie.shape)).toEqual([
      'backdropPath',
      'budget',
      'genres',
      'originalTitle',
      'overview',
      'posterPath',
      'releaseDate',
      'revenue',
      'runtime',
      'tagline',
      'title',
      'tmdbId',
      'voteAverage',
      'voteCount'
    ])
  })
})
