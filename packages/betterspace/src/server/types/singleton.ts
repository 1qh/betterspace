import type { ZodRawShape } from 'zod/v4'

import type { DocBase, RateLimitConfig, Rec, RegisteredMutation, RegisteredQuery, WithUrls } from './common'

type SingletonDoc<S extends ZodRawShape> = WithUrls<DocBase<S> & { userId: string }>

interface SingletonOptions {
  rateLimit?: RateLimitConfig
}

interface SingletonCrudResult<S extends ZodRawShape> {
  get: RegisteredQuery<'public', Rec, null | SingletonDoc<S>>
  upsert: RegisteredMutation<'public', Rec, SingletonDoc<S>>
}

export type { SingletonCrudResult, SingletonDoc, SingletonOptions }
