import type { Identity, Timestamp } from 'spacetimedb'
import type { TypeBuilder } from 'spacetimedb/server'
import type { ZodObject, ZodRawShape } from 'zod/v4'

import type {
  OrgCrudConfig,
  OrgCrudExports,
  OrgCrudFieldBuilders,
  OrgCrudFieldValues,
  OrgCrudMemberLike,
  OrgCrudOwnedRow,
  OrgCrudPkLike,
  OrgCrudTableLike
} from './types/org-crud'

import { identityEquals, makeError, makeOptionalFields, pickPatch, timestampEquals } from './reducer-utils'

interface UpdateArgs<F extends OrgCrudFieldBuilders, Id> extends Partial<OrgCrudFieldValues<F>> {
  expectedUpdatedAt?: Timestamp
  id: Id
}

const applyOrgPatch = <Row extends OrgCrudOwnedRow<OrgId>, OrgId>(
    row: Row,
    patch: Record<string, unknown>,
    timestamp: Timestamp
  ): Row => {
    const nextRecord = { ...(row as unknown as Record<string, unknown>) },
      patchKeys = Object.keys(patch)
    for (const key of patchKeys) nextRecord[key] = patch[key]
    nextRecord.updatedAt = timestamp
    return nextRecord as Row
  },
  checkMembership = <OrgId, Member extends OrgCrudMemberLike<OrgId>>(
    orgMemberTable: Iterable<Member>,
    orgId: OrgId,
    sender: Identity
  ): Member | null => {
    for (const member of orgMemberTable)
      if (Object.is(member.orgId, orgId) && identityEquals(member.userId, sender)) return member

    return null
  },
  requireMembership = <OrgId, Member extends OrgCrudMemberLike<OrgId>>({
    operation,
    orgId,
    orgMemberTable,
    sender,
    tableName
  }: {
    operation: string
    orgId: OrgId
    orgMemberTable: Iterable<Member>
    sender: Identity
    tableName: string
  }): Member => {
    const member = checkMembership(orgMemberTable, orgId, sender)
    if (!member) throw makeError('NOT_ORG_MEMBER', `${tableName}:${operation}`)
    return member
  },
  requireCanMutate = ({
    member,
    operation,
    row,
    sender,
    tableName
  }: {
    member: { isAdmin: boolean }
    operation: string
    row: { userId: Identity }
    sender: Identity
    tableName: string
  }) => {
    if (member.isAdmin) return
    if (!identityEquals(row.userId, sender)) throw makeError('FORBIDDEN', `${tableName}:${operation}`)
  },
  getOrgOwnedRow = <
    OrgId,
    Row extends OrgCrudOwnedRow<OrgId>,
    Id,
    Tbl extends OrgCrudTableLike<Row>,
    Pk extends OrgCrudPkLike<Row, Id>,
    Member extends OrgCrudMemberLike<OrgId>
  >({
    id,
    operation,
    orgMemberTable,
    pkAccessor,
    sender,
    table,
    tableName
  }: {
    id: Id
    operation: string
    orgMemberTable: Iterable<Member>
    pkAccessor: (table: Tbl) => Pk
    sender: Identity
    table: Tbl
    tableName: string
  }): { member: Member; pk: Pk; row: Row } => {
    const pk = pkAccessor(table),
      row = pk.find(id)
    if (!row) throw makeError('NOT_FOUND', `${tableName}:${operation}`)
    const member = requireMembership({ operation, orgId: row.orgId, orgMemberTable, sender, tableName })
    requireCanMutate({ member, operation, row, sender, tableName })
    return { member, pk, row }
  },
  makeOrgCrud = <
    DB,
    F extends OrgCrudFieldBuilders,
    OrgId,
    Row extends OrgCrudOwnedRow<OrgId>,
    Id,
    Tbl extends OrgCrudTableLike<Row>,
    Pk extends OrgCrudPkLike<Row, Id>,
    Member extends OrgCrudMemberLike<OrgId>,
    OrgMemberTbl extends Iterable<Member>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: OrgCrudFieldBuilders,
        fn: (ctx: { db: DB; sender: Identity; timestamp: Timestamp }, args: unknown) => void
      ) => unknown
    },
    config: OrgCrudConfig<DB, F, OrgId, Row, Id, Tbl, Pk, Member, OrgMemberTbl>
  ): OrgCrudExports => {
    const {
        expectedUpdatedAtField,
        fields,
        idField,
        options,
        orgIdField,
        orgMemberTable: orgMemberTableAccessor,
        pk: pkAccessor,
        table: tableAccessor,
        tableName
      } = config,
      hooks = options?.hooks,
      fieldNames = Object.keys(fields) as (keyof F & string)[],
      createName = `create_${tableName}`,
      updateName = `update_${tableName}`,
      rmName = `rm_${tableName}`,
      updateParams: Record<string, TypeBuilder<unknown, unknown>> = {
        id: idField
      },
      optionalFields = makeOptionalFields(fields),
      optionalKeys = Object.keys(optionalFields)
    for (const key of optionalKeys) {
      const field = optionalFields[key]
      if (field) updateParams[key] = field
    }

    if (expectedUpdatedAtField) updateParams.expectedUpdatedAt = expectedUpdatedAtField.optional()

    const createParams: Record<string, TypeBuilder<unknown, unknown>> = { orgId: orgIdField },
      fieldKeys = Object.keys(fields)
    for (const key of fieldKeys) createParams[key] = fields[key] as TypeBuilder<unknown, unknown>

    const createReducer = spacetimedb.reducer(
        { name: createName },
        createParams,
        (ctx, args: OrgCrudFieldValues<F> & { orgId: OrgId }) => {
          const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
            table = tableAccessor(ctx.db),
            orgMemberTable = orgMemberTableAccessor(ctx.db)

          requireMembership({
            operation: 'create',
            orgId: args.orgId,
            orgMemberTable,
            sender: ctx.sender,
            tableName
          })

          let data = args as OrgCrudFieldValues<F> & { orgId: OrgId }
          if (hooks?.beforeCreate) data = hooks.beforeCreate(hookCtx, { data })

          const { orgId, ...payload } = data as unknown as Record<string, unknown> & { orgId: OrgId },
            row = table.insert({
              ...payload,
              id: 0 as Id,
              orgId,
              updatedAt: ctx.timestamp,
              userId: ctx.sender
            } as Row)
          if (hooks?.afterCreate) hooks.afterCreate(hookCtx, { data, row })
        }
      ),
      updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args: UpdateArgs<F, Id>) => {
        const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
          table = tableAccessor(ctx.db),
          orgMemberTable = orgMemberTableAccessor(ctx.db),
          { pk, row } = getOrgOwnedRow({
            id: args.id,
            operation: 'update',
            orgMemberTable,
            pkAccessor,
            sender: ctx.sender,
            table,
            tableName
          })

        if (args.expectedUpdatedAt !== undefined && !timestampEquals(row.updatedAt, args.expectedUpdatedAt))
          throw makeError('CONFLICT', `${tableName}:update`)

        let patch = pickPatch(args, fieldNames)
        if (hooks?.beforeUpdate) patch = hooks.beforeUpdate(hookCtx, { patch, prev: row })

        const next = pk.update(applyOrgPatch(row, patch as Record<string, unknown>, ctx.timestamp))
        if (hooks?.afterUpdate) hooks.afterUpdate(hookCtx, { next, patch, prev: row })
      }),
      rmReducer = spacetimedb.reducer({ name: rmName }, { id: idField }, (ctx, { id }: { id: Id }) => {
        const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
          table = tableAccessor(ctx.db),
          orgMemberTable = orgMemberTableAccessor(ctx.db),
          { pk, row } = getOrgOwnedRow({
            id,
            operation: 'rm',
            orgMemberTable,
            pkAccessor,
            sender: ctx.sender,
            table,
            tableName
          })

        if (hooks?.beforeDelete) hooks.beforeDelete(hookCtx, { row })

        if (options?.softDelete) {
          const nextRecord = {
            ...(row as unknown as Record<string, unknown>),
            deletedAt: ctx.timestamp,
            updatedAt: ctx.timestamp
          }
          pk.update(nextRecord as Row)
        } else {
          const deleted = pk.delete(id)
          if (!deleted) throw makeError('NOT_FOUND', `${tableName}:rm`)
        }

        if (hooks?.afterDelete) hooks.afterDelete(hookCtx, { row })
      })

    return {
      exports: {
        [createName]: createReducer,
        [rmName]: rmReducer,
        [updateName]: updateReducer
      }
    }
  },
  orgCascade = <S extends ZodRawShape>(
    _schema: ZodObject<S>,
    config: { foreignKey: keyof S & string; table: string }
  ): { foreignKey: string; table: string } => config

export { checkMembership, makeOrgCrud, orgCascade }
