import type { Identity, Timestamp } from 'spacetimedb'
import type { AlgebraicTypeType, ColumnBuilder, ColumnMetadata, ReducerExport, TypeBuilder } from 'spacetimedb/server'

interface FileRowShape {
  contentType: string
  filename: string
  id: number
  size: number
  storageKey: string
  uploadedAt: Timestamp
  userId: Identity
}

type FileUploadBuilder =
  | ColumnBuilder<unknown, AlgebraicTypeType, ColumnMetadata<unknown>>
  | TypeBuilder<unknown, AlgebraicTypeType>

interface FileUploadConfig<
  DB,
  Row extends { contentType: string; filename: string; size: number; storageKey: string; userId: Identity },
  Id,
  Tbl extends FileUploadTableLike<Row>,
  Pk extends FileUploadPkLike<Row, Id>
> {
  allowedTypes?: Set<string>
  fields: FileUploadFields
  idField: TypeBuilder<Id, AlgebraicTypeType>
  maxFileSize?: number
  namespace: string
  pk: (table: Tbl) => Pk
  table: (db: DB) => Tbl
}

interface FileUploadExports {
  exports: Record<string, ReducerExportLike>
}

interface FileUploadFields {
  contentType: FileUploadBuilder
  filename: FileUploadBuilder
  size: FileUploadBuilder
  storageKey: FileUploadBuilder
}

interface FileUploadPkLike<Row, Id> {
  delete: (id: Id) => boolean
  find: (id: Id) => null | Row
}

interface FileUploadTableLike<Row> {
  insert: (row: Row) => Row
}

type ReducerExportLike = ReducerExport<never, never>

interface S3PresignCommonOptions {
  accessKeyId: string
  bucket: string
  endpoint: string
  expiresInSeconds?: number
  key: string
  region: string
  secretAccessKey: string
  sessionToken?: string
}

type S3PresignDownloadOptions = S3PresignCommonOptions

interface S3PresignedUrl {
  expiresAt: number
  headers: Record<string, string>
  key: string
  method: 'GET' | 'PUT'
  url: string
}

interface S3PresignUploadOptions extends S3PresignCommonOptions {
  contentType?: string
}

export type {
  FileRowShape,
  FileUploadBuilder,
  FileUploadConfig,
  FileUploadExports,
  FileUploadFields,
  FileUploadPkLike,
  FileUploadTableLike,
  S3PresignDownloadOptions,
  S3PresignedUrl,
  S3PresignUploadOptions
}
