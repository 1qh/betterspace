import type { ZodObject, ZodRawShape, z as _ } from 'zod/v4'

import type {
  ActionCtxLike,
  BaseBuilders,
  DbLike,
  DocBase,
  PaginatedResult,
  Qb,
  Rec,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery
} from './common'

interface CacheBuilders {
  action: BaseBuilders['m']
  cm: BaseBuilders['m']
  cq: Qb
  internalMutation: BaseBuilders['m']
  internalQuery: Qb<'internal'>
  mutation: BaseBuilders['m']
  query: Qb
}

interface CacheHookCtx {
  db: DbLike
}

interface CacheHooks {
  afterCreate?: (ctx: CacheHookCtx, args: { data: Rec; id: number | string }) => Promise<void> | void
  afterDelete?: (ctx: CacheHookCtx, args: { doc: Rec; id: number | string }) => Promise<void> | void
  afterUpdate?: (ctx: CacheHookCtx, args: { id: number | string; patch: Rec; prev: Rec }) => Promise<void> | void
  beforeCreate?: (ctx: CacheHookCtx, args: { data: Rec }) => Promise<Rec> | Rec
  beforeDelete?: (ctx: CacheHookCtx, args: { doc: Rec; id: number | string }) => Promise<void> | void
  beforeUpdate?: (ctx: CacheHookCtx, args: { id: number | string; patch: Rec; prev: Rec }) => Promise<Rec> | Rec
  onFetch?: (data: Rec) => Promise<Rec> | Rec
}

interface CacheOptions<S extends ZodRawShape, K extends keyof _.output<ZodObject<S>> & string> {
  fetcher?: (c: ActionCtxLike, key: _.output<ZodObject<S>>[K]) => Promise<_.output<ZodObject<S>>>
  hooks?: CacheHooks
  key: K
  schema: ZodObject<S>
  staleWhileRevalidate?: boolean
  table: string
  ttl?: number
}

interface CacheCrudResult<S extends ZodRawShape> {
  all: RegisteredQuery<'public', Rec, DocBase<S>[]>
  checkRL?: RegisteredMutation<'internal', Rec, void>
  create: RegisteredMutation<'public', Rec, number | string>
  get: RegisteredQuery<'public', Rec, (DocBase<S> & { cacheHit: true; stale: boolean }) | null>
  getInternal: RegisteredQuery<'internal', Rec, DocBase<S> | null>
  invalidate: RegisteredMutation<'public', Rec, DocBase<S> | null>
  list: RegisteredQuery<'public', Rec, PaginatedResult<DocBase<S>>>
  load: RegisteredAction<'public', Rec, _.output<ZodObject<S>> & { cacheHit: boolean }>
  purge: RegisteredMutation<'public', Rec, number>
  read: RegisteredQuery<'public', Rec, DocBase<S> | null>
  refresh: RegisteredAction<'public', Rec, _.output<ZodObject<S>> & { cacheHit: boolean }>
  rm: RegisteredMutation<'public', Rec, DocBase<S> | null>
  set: RegisteredMutation<'internal', Rec, void>
  update: RegisteredMutation<'public', Rec, DocBase<S>>
}

export type { CacheBuilders, CacheCrudResult, CacheHookCtx, CacheHooks, CacheOptions }
