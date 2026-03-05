import type { AlgebraicTypeType, ColumnBuilder, ColumnMetadata, table as stdbTable, TypeBuilder } from 'spacetimedb/server'

type FieldBuilder =
  | ColumnBuilder<unknown, AlgebraicTypeType, ColumnMetadata<unknown>>
  | TypeBuilder<unknown, AlgebraicTypeType>

interface KeyField {
  builder: FieldBuilder
  name: string
}

interface StdbDeps {
  t: {
    identity: () => { index: () => FieldBuilder }
    timestamp: () => FieldBuilder & { optional: () => FieldBuilder }
    u32: () => { autoInc: () => { primaryKey: () => FieldBuilder }; index: () => FieldBuilder }
  }
  table: (...args: Parameters<typeof stdbTable>) => StdbTable
}

type StdbTable = ReturnType<typeof stdbTable>

type TableFields = Record<string, FieldBuilder>
type TableOptions = Record<string, unknown>

const makeSchema = (deps: StdbDeps) => {
  const { t, table } = deps,
    tbl = (opts: TableOptions, fields: TableFields): StdbTable =>
      table({ public: true, ...opts } as never, fields as never),
    ownedTable = (fields: TableFields, extra?: TableFields, opts?: TableOptions): StdbTable =>
      tbl(
        { ...opts },
        { ...fields, ...extra, id: t.u32().autoInc().primaryKey(), updatedAt: t.timestamp(), userId: t.identity().index() }
      ),
    orgScopedTable = (fields: TableFields, extra?: TableFields, opts?: TableOptions): StdbTable =>
      tbl(
        { ...opts },
        {
          ...fields,
          ...extra,
          id: t.u32().autoInc().primaryKey(),
          orgId: t.u32().index(),
          updatedAt: t.timestamp(),
          userId: t.identity().index()
        }
      ),
    singletonTable = (fields: TableFields, opts?: TableOptions): StdbTable =>
      tbl({ ...opts }, { ...fields, updatedAt: t.timestamp(), userId: t.identity().index() }),
    cacheTable = (keyField: KeyField, fields: TableFields, opts?: TableOptions): StdbTable =>
      tbl(
        { ...opts },
        {
          ...fields,
          cachedAt: t.timestamp(),
          id: t.u32().autoInc().primaryKey(),
          invalidatedAt: t.timestamp().optional(),
          [keyField.name]: keyField.builder,
          updatedAt: t.timestamp()
        }
      ),
    childTable = (foreignKeyName: string, fields: TableFields, opts?: TableOptions): StdbTable =>
      tbl(
        { ...opts },
        {
          ...fields,
          [foreignKeyName]: t.u32().index(),
          id: t.u32().autoInc().primaryKey(),
          updatedAt: t.timestamp(),
          userId: t.identity().index()
        }
      )
  return { cacheTable, childTable, orgScopedTable, ownedTable, singletonTable }
}

export type { StdbDeps, StdbTable }
export { makeSchema }
