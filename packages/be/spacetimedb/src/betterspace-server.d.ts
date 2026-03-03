import type { ModuleExport } from 'spacetimedb/server'

interface PkLike<Row = Record<string, unknown>, Id = unknown> {
  delete: (id: Id) => boolean
  find: (id: Id) => null | Row
  update: (row: Row) => Row
}

interface IndexLike<Row = Record<string, unknown>, Key = unknown> extends Iterable<Row> {
  delete: (id: Key) => boolean
  filter: (value: Key) => Iterable<Row>
}

interface TableLike<Row = Record<string, unknown>> extends Iterable<Row> {
  id: PkLike<Row, unknown>
  orgId: IndexLike<Row, unknown>
  slug: IndexLike<Row, unknown>
  status: IndexLike<Row, unknown>
  tmdbId: PkLike<Row, unknown>
  token: IndexLike<Row, unknown>
  userId: IndexLike<Row, unknown>
  delete: (row: Row) => boolean
  insert: (row: Row) => Row
  update: (row: Row) => Row
}

interface DbLike {
  [key: string]: TableLike
}

interface ExportRecord {
  exports: Record<string, ModuleExport>
}

interface CrudConfig {
  expectedUpdatedAtField?: unknown
  fields: Record<string, unknown>
  idField: unknown
  options?: { softDelete?: boolean }
  orgIdField?: unknown
  orgMemberTable?: (db: DbLike) => TableLike
  parentPk?: (table: TableLike) => PkLike
  parentTable?: (db: DbLike) => TableLike
  pk: (table: TableLike) => PkLike
  table: (db: DbLike) => TableLike
  tableName: string
}

interface CacheConfig {
  fields: Record<string, unknown>
  keyField: unknown
  keyName: string
  pk: (table: TableLike) => PkLike
  table: (db: DbLike) => TableLike
  tableName: string
}

interface OrgConfig {
  builders: Record<string, unknown>
  cascadeTables?: Array<{
    deleteById: (db: DbLike, id: unknown) => boolean
    rowsByOrg: (db: DbLike, orgId: unknown) => Iterable<{ id: unknown }>
  }>
  fields: Record<string, unknown>
  orgByUserIndex: (table: TableLike) => Iterable<unknown>
  orgInviteByOrgIndex: (table: TableLike) => { filterByOrg: (orgId: unknown) => Iterable<unknown> } & Iterable<unknown>
  orgInviteByTokenIndex: (table: TableLike) => Iterable<unknown>
  orgInvitePk: (table: TableLike) => PkLike
  orgInviteTable: (db: DbLike) => TableLike
  orgJoinRequestByOrgIndex: (table: TableLike) => { filterByOrg: (orgId: unknown) => Iterable<unknown> } & Iterable<unknown>
  orgJoinRequestByOrgStatusIndex: (table: TableLike) => {
    filterByOrgStatus: (orgId: unknown, status: string) => Iterable<unknown>
  } & Iterable<unknown>
  orgJoinRequestPk: (table: TableLike) => PkLike
  orgJoinRequestTable: (db: DbLike) => TableLike
  orgMemberByOrgIndex: (table: TableLike) => { filterByOrg: (orgId: unknown) => Iterable<unknown> } & Iterable<unknown>
  orgMemberByUserIndex: (table: TableLike) => Iterable<unknown>
  orgMemberPk: (table: TableLike) => PkLike
  orgMemberTable: (db: DbLike) => TableLike
  orgPk: (table: TableLike) => PkLike
  orgSlugIndex: (table: TableLike) => Iterable<unknown>
  orgTable: (db: DbLike) => TableLike
}

interface FileUploadConfig {
  fields: { contentType: unknown; filename: unknown; size: unknown; storageKey: unknown }
  idField: unknown
  namespace: string
  pk: (table: TableLike) => PkLike
  table: (db: DbLike) => TableLike
}

declare const makeCacheCrud: (spacetimedb: unknown, config: CacheConfig) => ExportRecord
declare const makeChildCrud: (spacetimedb: unknown, config: CrudConfig & { foreignKeyField: unknown; foreignKeyName: string }) => ExportRecord
declare const makeCrud: (spacetimedb: unknown, config: CrudConfig) => ExportRecord
declare const makeFileUpload: (spacetimedb: unknown, config: FileUploadConfig) => ExportRecord
declare const makeOrg: (spacetimedb: unknown, config: OrgConfig) => ExportRecord
declare const makeOrgCrud: (
  spacetimedb: unknown,
  config: CrudConfig & { orgIdField: unknown; orgMemberTable: (db: DbLike) => TableLike }
) => ExportRecord
declare const makeSingletonCrud: (
  spacetimedb: unknown,
  config: { fields: Record<string, unknown>; table: (db: DbLike) => TableLike; tableName: string }
) => ExportRecord

export { makeCacheCrud, makeChildCrud, makeCrud, makeFileUpload, makeOrg, makeOrgCrud, makeSingletonCrud }
