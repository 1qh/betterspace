import type { ZodObject, ZodRawShape, z as _ } from 'zod/v4'

import type {
  BaseBuilders,
  DbLike,
  EnrichedDoc,
  HookCtx,
  PaginatedResult,
  Qb,
  RateLimitConfig,
  Rec,
  RegisteredMutation,
  RegisteredQuery,
  Visibility,
  WhereOf
} from './common'

interface CascadeOption {
  foreignKey: string
  table: string
}

interface CrudBuilders extends BaseBuilders {
  cm: BaseBuilders['m']
  cq: Qb
  pq: Qb
}

interface CrudHooks {
  afterCreate?: (ctx: HookCtx, args: { data: Rec; id: number | string }) => Promise<void> | void
  afterDelete?: (ctx: HookCtx, args: { doc: Rec; id: number | string }) => Promise<void> | void
  afterUpdate?: (ctx: HookCtx, args: { id: number | string; patch: Rec; prev: Rec }) => Promise<void> | void
  beforeCreate?: (ctx: HookCtx, args: { data: Rec }) => Promise<Rec> | Rec
  beforeDelete?: (ctx: HookCtx, args: { doc: Rec; id: number | string }) => Promise<void> | void
  beforeUpdate?: (ctx: HookCtx, args: { id: number | string; patch: Rec; prev: Rec }) => Promise<Rec> | Rec
}

interface CrudOptions<S extends ZodRawShape> {
  auth?: { where?: WhereOf<S> }
  cascade?: CascadeOption[] | false
  hooks?: CrudHooks
  pub?: { where?: WhereOf<S> }
  rateLimit?: RateLimitConfig
  search?: (keyof S & string) | true | { field?: keyof S & string; index?: string }
  softDelete?: boolean
}

interface CrudReadApi<S extends ZodRawShape, V extends Visibility = 'public'> {
  list: RegisteredQuery<V, { paginationOpts?: Rec; where?: WhereOf<S> }, PaginatedResult<EnrichedDoc<S>>>
  read: RegisteredQuery<V, { id: number | string; own?: boolean; where?: WhereOf<S> }, EnrichedDoc<S> | null>
  search?: RegisteredQuery<V, { query: string; where?: WhereOf<S> }, EnrichedDoc<S>[]>
}

interface CrudResult<S extends ZodRawShape> {
  auth: CrudReadApi<S>
  authIndexed: RegisteredQuery<
    'public',
    { index: string; key: string; value: string; where?: WhereOf<S> },
    EnrichedDoc<S>[]
  >
  bulkCreate: RegisteredMutation<'public', { items: _.output<ZodObject<S>>[] }, (number | string)[]>
  bulkRm: RegisteredMutation<'public', { ids: (number | string)[] }, number>
  bulkUpdate: RegisteredMutation<'public', { data: Partial<_.output<ZodObject<S>>>; ids: (number | string)[] }, unknown[]>
  create: RegisteredMutation<'public', _.output<ZodObject<S>>, number | string>
  pub: CrudReadApi<S>
  pubIndexed: RegisteredQuery<
    'public',
    { index: string; key: string; value: string; where?: WhereOf<S> },
    EnrichedDoc<S>[]
  >
  restore?: RegisteredMutation<'public', { id: number | string }, _.output<ZodObject<S>>>
  rm: RegisteredMutation<'public', { id: number | string }, _.output<ZodObject<S>>>
  update: RegisteredMutation<
    'public',
    Partial<_.output<ZodObject<S>>> & { expectedUpdatedAt?: number; id: number | string },
    _.output<ZodObject<S>>
  >
}

interface DbCtx {
  db: DbLike
}

export type { CascadeOption, CrudBuilders, CrudHooks, CrudOptions, CrudReadApi, CrudResult, DbCtx }
