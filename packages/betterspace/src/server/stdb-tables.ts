import type { AlgebraicTypeType, ColumnBuilder, ColumnMetadata, TypeBuilder } from 'spacetimedb/server'

type FieldBuilder =
  | ColumnBuilder<unknown, AlgebraicTypeType, ColumnMetadata<unknown>>
  | TypeBuilder<unknown, AlgebraicTypeType>

interface KeyField {
  builder: FieldBuilder
  name: string
}

interface StdbServerModule {
  t: Record<string, (...args: unknown[]) => unknown>
  table: (opts: unknown, fields: Record<string, unknown>) => unknown
}

type TableFields = Record<string, FieldBuilder>
type TableOptions = Record<string, unknown>

const loadStdb = (): StdbServerModule => {
    const meta = import.meta as { require?: (id: string) => unknown }
    if (typeof meta.require !== 'function') throw new Error('spacetimedb/server is unavailable in this runtime')
    return meta.require('spacetimedb/server') as StdbServerModule
  },
  makeOwnedTable = (fields: TableFields, opts?: TableOptions): unknown => {
    const { t, table } = loadStdb(),
      u32 = t.u32 as () => { autoInc: () => { primaryKey: () => FieldBuilder } },
      timestamp = t.timestamp as () => FieldBuilder,
      identity = t.identity as () => { index: () => FieldBuilder }
    return table(
      { public: true, ...opts },
      {
        ...fields,
        id: u32().autoInc().primaryKey(),
        updatedAt: timestamp(),
        userId: identity().index()
      }
    )
  },
  makeOrgTable = (fields: TableFields, opts?: TableOptions): unknown => {
    const { t, table } = loadStdb(),
      u32 = t.u32 as () => { autoInc: () => { primaryKey: () => FieldBuilder }; index: () => FieldBuilder },
      timestamp = t.timestamp as () => FieldBuilder,
      identity = t.identity as () => { index: () => FieldBuilder }
    return table(
      { public: true, ...opts },
      {
        ...fields,
        id: u32().autoInc().primaryKey(),
        orgId: u32().index(),
        updatedAt: timestamp(),
        userId: identity().index()
      }
    )
  },
  makeSingletonTable = (fields: TableFields, opts?: TableOptions): unknown => {
    const { t, table } = loadStdb(),
      timestamp = t.timestamp as () => FieldBuilder,
      identity = t.identity as () => { index: () => FieldBuilder }
    return table({ public: true, ...opts }, { ...fields, updatedAt: timestamp(), userId: identity().index() })
  },
  makeCacheTable = (keyField: KeyField, fields: TableFields, opts?: TableOptions): unknown => {
    const { t, table } = loadStdb(),
      u32 = t.u32 as () => { autoInc: () => { primaryKey: () => FieldBuilder } },
      timestamp = t.timestamp as () => FieldBuilder & { optional: () => FieldBuilder }
    return table(
      { public: true, ...opts },
      {
        ...fields,
        cachedAt: timestamp(),
        id: u32().autoInc().primaryKey(),
        invalidatedAt: timestamp().optional(),
        [keyField.name]: keyField.builder,
        updatedAt: timestamp()
      }
    )
  },
  makeChildTable = (foreignKeyName: string, fields: TableFields, opts?: TableOptions): unknown => {
    const { t, table } = loadStdb(),
      u32 = t.u32 as () => { autoInc: () => { primaryKey: () => FieldBuilder }; index: () => FieldBuilder },
      timestamp = t.timestamp as () => FieldBuilder,
      identity = t.identity as () => { index: () => FieldBuilder }
    return table(
      { public: true, ...opts },
      {
        ...fields,
        [foreignKeyName]: u32().index(),
        id: u32().autoInc().primaryKey(),
        updatedAt: timestamp(),
        userId: identity().index()
      }
    )
  }

export { makeCacheTable, makeChildTable, makeOrgTable, makeOwnedTable, makeSingletonTable }
