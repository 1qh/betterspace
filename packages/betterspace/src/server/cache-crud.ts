import type { Timestamp } from 'spacetimedb'
import type { TypeBuilder } from 'spacetimedb/server'

import type {
  CacheConfig,
  CacheExports,
  CacheFieldBuilders,
  CacheFieldValues,
  CachePkLike,
  CacheTableLike
} from './types/cache'

interface OptionalBuilder {
  optional: () => TypeBuilder<unknown, unknown>
}

type UpdateArgs<F extends CacheFieldBuilders> = Partial<CacheFieldValues<F>>

const DAYS_PER_WEEK = 7,
  HOURS_PER_DAY = 24,
  MINUTES_PER_HOUR = 60,
  SECONDS_PER_MINUTE = 60,
  MILLIS_PER_SECOND = 1000,
  DEFAULT_TTL_MS = DAYS_PER_WEEK * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLIS_PER_SECOND,
  makeError = (code: string, message: string): Error => new Error(`${code}: ${message}`),
  parseTimestampText = (value: string): null | number => {
    const parsedNumber = Number(value)
    if (Number.isFinite(parsedNumber)) return parsedNumber
    const parsedDate = Date.parse(value)
    if (Number.isFinite(parsedDate)) return parsedDate
    return null
  },
  parseTimestampValue = (value: unknown): null | number => {
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string') return parseTimestampText(value)
    return null
  },
  makeOptionalFields = (fields: CacheFieldBuilders) => {
    const params: Record<string, TypeBuilder<unknown, unknown>> = {},
      keys = Object.keys(fields)
    for (const key of keys) {
      const field = fields[key] as unknown as OptionalBuilder
      params[key] = field.optional()
    }
    return params
  },
  pickPatch = <F extends CacheFieldBuilders>(
    args: UpdateArgs<F>,
    fieldNames: string[]
  ): Partial<CacheFieldValues<F>> => {
    const patchRecord: Record<string, unknown> = {},
      argsRecord = args as unknown as Record<string, unknown>
    for (const key of fieldNames) {
      const value = argsRecord[key]
      if (value !== undefined) patchRecord[key] = value
    }
    return patchRecord as Partial<CacheFieldValues<F>>
  },
  timestampToMs = (value: Timestamp): number => {
    const timestamp = value as unknown as {
      toJSON?: () => string
      toString?: () => string
      valueOf?: () => number | string
    },

     fromValue = typeof timestamp.valueOf === 'function' ? parseTimestampValue(timestamp.valueOf()) : null
    if (fromValue !== null) return fromValue

    const fromJson = typeof timestamp.toJSON === 'function' ? parseTimestampValue(timestamp.toJSON()) : null
    if (fromJson !== null) return fromJson

    const fromString = typeof timestamp.toString === 'function' ? parseTimestampValue(timestamp.toString()) : null
    if (fromString !== null) return fromString

    throw makeError('INVALID_TIMESTAMP', 'cache:timestamp')
  },
  isExpired = (cachedAt: Timestamp, now: Timestamp, ttl: number): boolean => timestampToMs(cachedAt) + ttl < timestampToMs(now),
  makeCacheCrud = <
    DB,
    F extends CacheFieldBuilders,
    Row,
    Key,
    Tbl extends CacheTableLike<Row>,
    Pk extends CachePkLike<Row, Key>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: CacheFieldBuilders,
        fn: (ctx: { db: DB; timestamp: Timestamp }, args: unknown) => void
      ) => unknown
    },
    config: CacheConfig<DB, F, Row, Key, Tbl, Pk>
  ): CacheExports => {
    const { fields, keyField, keyName, options, pk: pkAccessor, table: tableAccessor, tableName } = config,
      ttl = options?.ttl ?? DEFAULT_TTL_MS,
      fieldNames = Object.keys(fields) as (keyof F & string)[],
      createName = `create_${tableName}`,
      updateName = `update_${tableName}`,
      rmName = `rm_${tableName}`,
      invalidateName = `invalidate_${tableName}`,
      purgeName = `purge_${tableName}`,
      createParams: CacheFieldBuilders = {
        [keyName]: keyField
      },
      updateParams: CacheFieldBuilders = {
        [keyName]: keyField
      },
      optionalFields = makeOptionalFields(fields),
      createKeys = Object.keys(fields),
      optionalKeys = Object.keys(optionalFields)

    for (const key of createKeys) {
      const field = fields[key]
      if (field) createParams[key] = field
    }

    for (const key of optionalKeys) {
      const field = optionalFields[key]
      if (field) updateParams[key] = field
    }

    const createReducer = spacetimedb.reducer(
        { name: createName },
        createParams,
        (ctx, args: CacheFieldValues<F> & Record<string, unknown>) => {
          const table = tableAccessor(ctx.db),
            argsRecord = args as Record<string, unknown>,
            keyValue = argsRecord[keyName] as Key,
            payload = {
              ...argsRecord,
              cachedAt: ctx.timestamp,
              id: 0,
              invalidatedAt: null,
              [keyName]: keyValue,
              updatedAt: ctx.timestamp
            } as Row
          table.insert(payload)
        }
      ),
      updateReducer = spacetimedb.reducer({ name: updateName }, updateParams, (ctx, args: Record<string, unknown> & UpdateArgs<F>) => {
        const table = tableAccessor(ctx.db),
          argsRecord = args as Record<string, unknown>,
          keyValue = argsRecord[keyName] as Key,
          pk = pkAccessor(table),
          row = pk.find(keyValue)

        if (!row) throw makeError('NOT_FOUND', `${tableName}:update`)

        const patch = pickPatch(args, fieldNames),
          nextRecord = {
            ...(row as unknown as Record<string, unknown>),
            invalidatedAt: null,
            updatedAt: ctx.timestamp
          },
          patchKeys = Object.keys(patch as Record<string, unknown>)

        for (const key of patchKeys) {
          const value = (patch as Record<string, unknown>)[key]
          if (value !== undefined) nextRecord[key] = value
        }

        pk.update(nextRecord as Row)
      }),
      rmReducer = spacetimedb.reducer({ name: rmName }, { [keyName]: keyField }, (ctx, args: Record<string, unknown> & { key: Key }) => {
        const table = tableAccessor(ctx.db),
          argsRecord = args as Record<string, unknown>,
          keyValue = argsRecord[keyName] as Key,
          pk = pkAccessor(table),
          row = pk.find(keyValue)

        if (!row) throw makeError('NOT_FOUND', `${tableName}:rm`)
        const removed = pk.delete(keyValue)
        if (!removed) throw makeError('NOT_FOUND', `${tableName}:rm`)
      }),
      invalidateReducer = spacetimedb.reducer(
        { name: invalidateName },
        { [keyName]: keyField },
        (ctx, args: Record<string, unknown> & { key: Key }) => {
          const table = tableAccessor(ctx.db),
            argsRecord = args as Record<string, unknown>,
            keyValue = argsRecord[keyName] as Key,
            pk = pkAccessor(table),
            row = pk.find(keyValue)

          if (!row) throw makeError('NOT_FOUND', `${tableName}:invalidate`)

          const nextRecord = {
            ...(row as unknown as Record<string, unknown>),
            invalidatedAt: ctx.timestamp,
            updatedAt: ctx.timestamp
          } as Row

          pk.update(nextRecord)
        }
      ),
      purgeReducer = spacetimedb.reducer({ name: purgeName }, {}, ctx => {
        const table = tableAccessor(ctx.db),
          pk = pkAccessor(table),
          keysToDelete: Key[] = []

        for (const row of table) {
          const rowRecord = row as unknown as Record<string, unknown>,
            cachedAt = rowRecord.cachedAt as Timestamp
          if (isExpired(cachedAt, ctx.timestamp, ttl)) {
            const keyValue = rowRecord[keyName] as Key
            keysToDelete.push(keyValue)
          }
        }

        for (const key of keysToDelete) pk.delete(key)
      })

    return {
      exports: {
        [createName]: createReducer,
        [invalidateName]: invalidateReducer,
        [purgeName]: purgeReducer,
        [rmName]: rmReducer,
        [updateName]: updateReducer
      }
    }
  }

export { makeCacheCrud }
