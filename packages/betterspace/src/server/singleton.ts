import type { Identity, Timestamp } from 'spacetimedb'

import type {
  SingletonConfig,
  SingletonExports,
  SingletonFieldBuilders,
  SingletonFieldValues,
  SingletonTableLike
} from './types/singleton'

import { identityEquals, makeError, makeOptionalFields } from './reducer-utils'

interface SingletonRow {
  updatedAt: Timestamp
  userId: Identity
}

const findByUser = (table: SingletonTableLike<SingletonRow>, sender: Identity): null | SingletonRow => {
    for (const row of table) if (identityEquals(row.userId, sender)) return row

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
    return nextRecord as unknown as Row
  },
  /** Generates get and upsert reducers for a per-user singleton table. */
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
      upsertParams: SingletonFieldBuilders = {},
      optionalFields = makeOptionalFields(fields),
      optionalKeys = Object.keys(optionalFields)

    for (const key of optionalKeys) {
      const field = optionalFields[key]
      if (field) upsertParams[key] = field
    }

    const getReducer = spacetimedb.reducer({ name: getName }, {}, ctx => {
        const table = tableAccessor(ctx.db),
          row = findByUser(table as unknown as SingletonTableLike<SingletonRow>, ctx.sender)
        if (!row) throw makeError('NOT_FOUND', `${tableName}:get`)
        if (hooks?.beforeRead)
          hooks.beforeRead({ db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp }, { row: row as unknown as Row })
      }),
      upsertReducer = spacetimedb.reducer({ name: upsertName }, upsertParams, (ctx, args) => {
        const typedArgs = args as Partial<SingletonFieldValues<F>>,
          hookCtx = { db: ctx.db, sender: ctx.sender, timestamp: ctx.timestamp },
          table = tableAccessor(ctx.db),
          existing = findByUser(table as unknown as SingletonTableLike<SingletonRow>, ctx.sender),
          patchRecord = typedArgs as Record<string, unknown>

        if (existing) {
          if (hooks?.beforeUpdate)
            hooks.beforeUpdate(hookCtx, {
              patch: patchRecord as unknown as Partial<SingletonFieldValues<F>>,
              prev: existing as unknown as Row
            })
          const nextRecord = applyPatch(existing as unknown as Row, patchRecord, { fieldNames, timestamp: ctx.timestamp })
          table.update(nextRecord)
          if (hooks?.afterUpdate)
            hooks.afterUpdate(hookCtx, {
              next: nextRecord,
              patch: patchRecord as unknown as Partial<SingletonFieldValues<F>>,
              prev: existing as unknown as Row
            })
        } else {
          if (hooks?.beforeCreate)
            hooks.beforeCreate(hookCtx, { data: patchRecord as unknown as Partial<SingletonFieldValues<F>> })
          const newRow = { ...patchRecord, updatedAt: ctx.timestamp, userId: ctx.sender } as Row
          table.insert(newRow)
          if (hooks?.afterCreate)
            hooks.afterCreate(hookCtx, {
              data: patchRecord as unknown as Partial<SingletonFieldValues<F>>,
              row: newRow
            })
        }
      }),
      exportsRecord = {
        [getName]: getReducer,
        [upsertName]: upsertReducer
      } as unknown as SingletonExports['exports']

    return {
      exports: exportsRecord
    }
  }

export { makeSingletonCrud }
