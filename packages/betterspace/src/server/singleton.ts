import type { Identity, Timestamp } from 'spacetimedb'
import type { TypeBuilder } from 'spacetimedb/server'

import type {
  SingletonConfig,
  SingletonExports,
  SingletonFieldBuilders,
  SingletonFieldValues,
  SingletonTableLike
} from './types/singleton'

interface OptionalBuilder {
  optional: () => TypeBuilder<unknown, unknown>
}

interface SingletonRow {
  updatedAt: Timestamp
  userId: Identity
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
  makeOptionalFields = (fields: SingletonFieldBuilders) => {
    const params: Record<string, TypeBuilder<unknown, unknown>> = {},
      keys = Object.keys(fields)
    for (const key of keys) {
      const field = fields[key] as unknown as OptionalBuilder
      params[key] = field.optional()
    }
    return params
  },
  findByUser = (
    table: SingletonTableLike<SingletonRow>,
    sender: Identity
  ): null | SingletonRow => {
    for (const row of table) 
      if (identityEquals(row.userId, sender)) return row
    
    return null
  },
  applyPatch = <Row extends SingletonRow>(
    row: Row,
    patch: Record<string, unknown>,
    opts: { fieldNames: string[]; timestamp: Timestamp }
  ): Row => {
    const nextRecord = { ...(row as unknown as Record<string, unknown>) }
    for (const key of opts.fieldNames) {
      const value = patch[key]
      if (value !== undefined) nextRecord[key] = value
    }
    nextRecord.updatedAt = opts.timestamp
    return nextRecord as Row
  },
  makeSingletonCrud = <
    DB,
    F extends SingletonFieldBuilders,
    Row extends SingletonRow,
    Tbl extends SingletonTableLike<Row>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: SingletonFieldBuilders,
        fn: (ctx: { db: DB; sender: Identity; timestamp: Timestamp }, args: unknown) => void
      ) => unknown
    },
    config: SingletonConfig<DB, F, Row, Tbl>
  ): SingletonExports => {
    const { fields, options, table: tableAccessor, tableName } = config,
      hooks = options?.hooks,
      fieldNames = Object.keys(fields) as (keyof F & string)[],
      getName = `get_${tableName}`,
      upsertName = `upsert_${tableName}`,
      upsertParams: Record<string, TypeBuilder<unknown, unknown>> = {},
      optionalFields = makeOptionalFields(fields),
      optionalKeys = Object.keys(optionalFields)

    for (const key of optionalKeys) {
      const field = optionalFields[key]
      if (field) upsertParams[key] = field
    }

    const getReducer = spacetimedb.reducer({ name: getName }, {}, ctx => {
        const table = tableAccessor(ctx.db),
          row = findByUser(table, ctx.sender)
        if (!row) throw makeError('NOT_FOUND', `${tableName}:get`)
        if (hooks?.beforeRead) hooks.beforeRead({ db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, { row })
      }),
      upsertReducer = spacetimedb.reducer(
        { name: upsertName },
        upsertParams,
        (ctx, args: Partial<SingletonFieldValues<F>>) => {
          const hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
            table = tableAccessor(ctx.db),
            existing = findByUser(table, ctx.sender),
            patchRecord = args as Record<string, unknown>

          if (existing) {
            if (hooks?.beforeUpdate) hooks.beforeUpdate(hookCtx, { patch: patchRecord, prev: existing })
            const nextRecord = applyPatch(existing, patchRecord, { fieldNames, timestamp: ctx.timestamp })
            table.update(nextRecord)
            if (hooks?.afterUpdate) hooks.afterUpdate(hookCtx, { next: nextRecord, patch: patchRecord, prev: existing })
          } else {
            if (hooks?.beforeCreate) hooks.beforeCreate(hookCtx, { data: patchRecord })
            const newRow = { ...patchRecord, updatedAt: ctx.timestamp, userId: ctx.sender } as Row
            table.insert(newRow)
            if (hooks?.afterCreate) hooks.afterCreate(hookCtx, { data: patchRecord, row: newRow })
          }
        }
      )

    return {
      exports: {
        [getName]: getReducer,
        [upsertName]: upsertReducer
      }
    }
  }

export { makeSingletonCrud }
