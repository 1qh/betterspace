import type { Identity, Timestamp } from 'spacetimedb'
import type { TypeBuilder } from 'spacetimedb/server'

import type {
  ChildCrudConfig,
  ChildCrudExports,
  ChildParentPkLike,
  CrudFieldBuilders,
  CrudFieldValues,
  CrudPkLike,
  CrudTableLike
} from './types/child'

interface OptionalBuilder {
  optional: () => TypeBuilder<unknown, unknown>
}

interface OwnedRow {
  updatedAt: Timestamp
  userId: Identity
}

interface UpdateArgs<F extends CrudFieldBuilders, Id> extends Partial<CrudFieldValues<F>> {
  expectedUpdatedAt?: Timestamp
  id: Id
}

const makeError = (code: string, message: string): Error => new Error(`${code}: ${message}`),
  identityEquals = (a: Identity, b: Identity): boolean => {
    const left = a as unknown as { isEqual?: (v: unknown) => boolean; toHexString?: () => string }
    if (typeof left.isEqual === 'function') return left.isEqual(b)
    const right = b as unknown as { toHexString?: () => string }
    if (typeof left.toHexString === 'function' && typeof right.toHexString === 'function')
      return left.toHexString() === right.toHexString()
    return Object.is(a, b)
  },
  timestampEquals = (a: Timestamp, b: Timestamp): boolean => {
    const left = a as unknown as { isEqual?: (v: unknown) => boolean; toJSON?: () => string }
    if (typeof left.isEqual === 'function') return left.isEqual(b)
    const right = b as unknown as { toJSON?: () => string }
    if (typeof left.toJSON === 'function' && typeof right.toJSON === 'function')
      return left.toJSON() === right.toJSON()
    return Object.is(a, b)
  },
  makeOptionalFields = (fields: CrudFieldBuilders) => {
    const params: Record<string, TypeBuilder<unknown, unknown>> = {},
      keys = Object.keys(fields)
    for (const key of keys) {
      const field = fields[key] as unknown as OptionalBuilder
      params[key] = field.optional()
    }
    return params
  },
  pickPatch = <F extends CrudFieldBuilders>(
    args: UpdateArgs<F, unknown>,
    fieldNames: string[]
  ): Partial<CrudFieldValues<F>> => {
    const patchRecord: Record<string, unknown> = {},
      argsRecord = args as unknown as Record<string, unknown>
    for (const key of fieldNames) {
      const value = argsRecord[key]
      if (value !== undefined) patchRecord[key] = value
    }
    return patchRecord as Partial<CrudFieldValues<F>>
  },
  applyPatch = <Row extends OwnedRow>(row: Row, patch: Record<string, unknown>, timestamp: Timestamp): Row => {
    const nextRecord = { ...(row as unknown as Record<string, unknown>) },
      patchKeys = Object.keys(patch)
    for (const key of patchKeys) nextRecord[key] = patch[key]
    nextRecord.updatedAt = timestamp
    return nextRecord as Row
  },
  getOwnedRow = <Row extends OwnedRow, Id, Tbl extends CrudTableLike<Row>, Pk extends CrudPkLike<Row, Id>>({
    ctxSender,
    id,
    operation,
    pkAccessor,
    table,
    tableName
  }: {
    ctxSender: Identity
    id: Id
    operation: string
    pkAccessor: (table: Tbl) => Pk
    table: Tbl
    tableName: string
  }): { pk: Pk; row: Row } => {
    const pk = pkAccessor(table),
      row = pk.find(id)
    if (!row) throw makeError('NOT_FOUND', `${tableName}:${operation}`)
    if (!identityEquals(row.userId, ctxSender)) throw makeError('FORBIDDEN', `${tableName}:${operation}`)
    return { pk, row }
  },
  makeChildCrud = <
    DB,
    F extends CrudFieldBuilders,
    Row extends OwnedRow,
    Id,
    Tbl extends CrudTableLike<Row>,
    Pk extends CrudPkLike<Row, Id>,
    ParentRow,
    ParentId,
    ParentTbl,
    ParentPk extends ChildParentPkLike<ParentRow, ParentId>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: CrudFieldBuilders,
        fn: (ctx: { db: DB; sender: Identity; timestamp: Timestamp }, args: unknown) => void
      ) => unknown
    },
    config: ChildCrudConfig<DB, F, Row, Id, Tbl, Pk, ParentRow, ParentId, ParentTbl, ParentPk>
  ): ChildCrudExports => {
    const {
        expectedUpdatedAtField,
        fields,
        foreignKeyField,
        foreignKeyName,
        idField,
        options,
        parentPk: parentPkAccessor,
        parentTable: parentTableAccessor,
        pk: pkAccessor,
        table: tableAccessor,
        tableName
      } = config,
      hooks = options?.hooks,
      fieldNames = Object.keys(fields) as (keyof F & string)[],
      createName = `create_${tableName}`,
      updateName = `update_${tableName}`,
      rmName = `rm_${tableName}`,
      createParams: CrudFieldBuilders = {
        [foreignKeyName]: foreignKeyField as TypeBuilder<unknown, unknown>
      },
      createFieldKeys = Object.keys(fields),
      updateParams: Record<string, TypeBuilder<unknown, unknown>> = {
        id: idField
      },
      optionalFields = makeOptionalFields(fields),
      optionalKeys = Object.keys(optionalFields)

    for (const key of createFieldKeys) {
      const field = fields[key]
      if (field) createParams[key] = field
    }

    for (const key of optionalKeys) {
      const field = optionalFields[key]
      if (field) updateParams[key] = field
    }

    if (expectedUpdatedAtField) updateParams.expectedUpdatedAt = expectedUpdatedAtField.optional()

    const createReducer = spacetimedb.reducer(
        { name: createName },
        createParams,
        (ctx, args: CrudFieldValues<F> & Record<string, unknown>) => {
          const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
            table = tableAccessor(ctx.db),
            argsRecord = args as Record<string, unknown>,
            parentId = argsRecord[foreignKeyName] as ParentId,
            parent = parentPkAccessor(parentTableAccessor(ctx.db)).find(parentId)

          if (!parent) throw makeError('NOT_FOUND', `${tableName}:create`)

          let data = args
          if (hooks?.beforeCreate) data = hooks.beforeCreate(hookCtx, { data })
          const payload = data as unknown as Record<string, unknown>
          table.insert({
            ...payload,
            [foreignKeyName]: parentId,
            id: 0 as Id,
            updatedAt: ctx.timestamp,
            userId: ctx.sender
          } as Row)
        }
      ),
      updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args: UpdateArgs<F, Id>) => {
        const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
          table = tableAccessor(ctx.db),
          { pk, row } = getOwnedRow({
            ctxSender: ctx.sender,
            id: args.id,
            operation: 'update',
            pkAccessor,
            table,
            tableName
          })

        if (args.expectedUpdatedAt !== undefined && !timestampEquals(row.updatedAt, args.expectedUpdatedAt))
          throw makeError('CONFLICT', `${tableName}:update`)

        let patch = pickPatch(args, fieldNames)
        if (hooks?.beforeUpdate) patch = hooks.beforeUpdate(hookCtx, { patch, prev: row })

        const next = pk.update(applyPatch(row, patch as Record<string, unknown>, ctx.timestamp))
        if (hooks?.afterUpdate) hooks.afterUpdate(hookCtx, { next, patch, prev: row })
      }),
      rmReducer = spacetimedb.reducer({ name: rmName }, { id: idField }, (ctx, { id }: { id: Id }) => {
        const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
          table = tableAccessor(ctx.db),
          { pk, row } = getOwnedRow({
            ctxSender: ctx.sender,
            id,
            operation: 'rm',
            pkAccessor,
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
  }

export { makeChildCrud }
