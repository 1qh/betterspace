import type { ZodObject, ZodRawShape, z as _ } from 'zod/v4'

import type { DocBase, Rec, RegisteredMutation, RegisteredQuery } from './common'

interface ChildConfig {
  foreignKey: string
  index?: string
  parent: string
  parentSchema?: ZodObject<ZodRawShape>
  schema: ZodObject<ZodRawShape>
}

interface ChildCrudResult<S extends ZodRawShape> {
  bulkCreate: RegisteredMutation<'public', Rec, (number | string)[]>
  bulkRm: RegisteredMutation<'public', Rec, number>
  bulkUpdate: RegisteredMutation<'public', Rec, DocBase<S>[]>
  create: RegisteredMutation<'public', _.output<ZodObject<S>>, number | string>
  get: RegisteredQuery<'public', Rec, DocBase<S> | null>
  list: RegisteredQuery<'public', Rec, DocBase<S>[]>
  pub?: {
    get: RegisteredQuery<'public', Rec, DocBase<S> | null>
    list: RegisteredQuery<'public', Rec, DocBase<S>[]>
  }
  rm: RegisteredMutation<'public', Rec, DocBase<S>>
  update: RegisteredMutation<'public', Rec, DocBase<S> | null>
}

export type { ChildConfig, ChildCrudResult }
