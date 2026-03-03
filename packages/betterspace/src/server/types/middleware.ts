import type { GlobalHookCtx, Rec } from './common'

interface MiddlewareCtx extends GlobalHookCtx {
  operation: 'create' | 'delete' | 'update'
}

interface Middleware {
  afterCreate?: (ctx: MiddlewareCtx, args: { data: Rec; id: number | string }) => Promise<void> | void
  afterDelete?: (ctx: MiddlewareCtx, args: { doc: Rec; id: number | string }) => Promise<void> | void
  afterUpdate?: (ctx: MiddlewareCtx, args: { id: number | string; patch: Rec; prev: Rec }) => Promise<void> | void
  beforeCreate?: (ctx: MiddlewareCtx, args: { data: Rec }) => Promise<Rec> | Rec
  beforeDelete?: (ctx: MiddlewareCtx, args: { doc: Rec; id: number | string }) => Promise<void> | void
  beforeUpdate?: (ctx: MiddlewareCtx, args: { id: number | string; patch: Rec; prev: Rec }) => Promise<Rec> | Rec
  name: string
}

export type { Middleware, MiddlewareCtx }
