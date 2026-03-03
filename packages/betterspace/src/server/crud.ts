import type { Identity, Timestamp } from 'spacetimedb'
import type { TypeBuilder } from 'spacetimedb/server'
import type { ZodObject, ZodRawShape } from 'zod/v4'

import type { CrudConfig, CrudExports, CrudFieldBuilders, CrudFieldValues, CrudPkLike, CrudTableLike } from './types/crud'

import { applyPatch, getOwnedRow, makeError, makeOptionalFields, pickPatch, timestampEquals } from './reducer-utils'

interface UpdateArgs<F extends CrudFieldBuilders, Id> extends Partial<CrudFieldValues<F>> {
  expectedUpdatedAt?: Timestamp
  id: Id
}

const makeCrud = <
    DB,
    F extends CrudFieldBuilders,
    Row extends OwnedRow,
    Id,
    Tbl extends CrudTableLike<Row>,
    Pk extends CrudPkLike<Row, Id>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: CrudFieldBuilders,
        fn: (ctx: { db: DB; sender: Identity; timestamp: Timestamp }, args: unknown) => void
      ) => unknown
    },
    config: CrudConfig<DB, F, Row, Id, Tbl, Pk>
  ): CrudExports => {
    const { expectedUpdatedAtField, fields, idField, options, pk: pkAccessor, table: tableAccessor, tableName } = config,
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

    const createReducer = spacetimedb.reducer({ name: createName }, fields, (ctx, args: CrudFieldValues<F>) => {
        const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
          table = tableAccessor(ctx.db)
        let data = args
        if (hooks?.beforeCreate) data = hooks.beforeCreate(hookCtx, { data })
        const payload = data as unknown as Record<string, unknown>,
          row = table.insert({
            ...payload,
            id: 0 as Id,
            updatedAt: ctx.timestamp,
            userId: ctx.sender
          } as Row)
        if (hooks?.afterCreate) hooks.afterCreate(hookCtx, { data, row })
      }),
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
  },
  ownedCascade = <S extends ZodRawShape>(
    _schema: ZodObject<S>,
    config: { foreignKey: keyof S & string; table: string }
  ): { foreignKey: string; table: string } => config

export { makeCrud, ownedCascade }
