import type { ZodObject, ZodRawShape, z as _ } from 'zod/v4'

import type { DocBase, OrgEnrichedDoc, OrgRole, Rec, RegisteredMutation, RegisteredQuery } from './common'

type OrgCascadeTableConfig<DM = Record<string, unknown>> =
  | (keyof DM & string)
  | { fileFields?: string[]; table: keyof DM & string }

interface CanEditOpts {
  acl: boolean
  doc: {
    editors?: string[]
    userId: string
  }
  role: OrgRole
  userId: string
}

interface OrgCrudResult<S extends ZodRawShape> {
  addEditor: RegisteredMutation<'public', Rec, DocBase<S> | null>
  bulkCreate: RegisteredMutation<'public', Rec, (number | string)[]>
  bulkRm: RegisteredMutation<'public', Rec, number>
  bulkUpdate: RegisteredMutation<'public', Rec, DocBase<S>[]>
  create: RegisteredMutation<'public', _.output<ZodObject<S>>, number | string>
  editors: RegisteredQuery<'public', Rec, { email: string; name: string; userId: string }[]>
  list: RegisteredQuery<'public', Rec, { continueCursor: string; isDone: boolean; page: OrgEnrichedDoc<S>[] }>
  read: RegisteredQuery<'public', Rec, OrgEnrichedDoc<S>>
  removeEditor: RegisteredMutation<'public', Rec, DocBase<S> | null>
  restore?: RegisteredMutation<'public', Rec, DocBase<S>>
  rm: RegisteredMutation<'public', Rec, DocBase<S>>
  setEditors: RegisteredMutation<'public', Rec, DocBase<S> | null>
  update: RegisteredMutation<'public', Rec, DocBase<S> | null>
}

export type { CanEditOpts, OrgCascadeTableConfig, OrgCrudResult }
