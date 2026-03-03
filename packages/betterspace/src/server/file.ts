import type { Identity, Timestamp } from 'spacetimedb'
import type { TypeBuilder } from 'spacetimedb/server'

import type {
  FileUploadConfig,
  FileUploadExports,
  FileUploadPkLike,
  FileUploadTableLike,
  S3PresignDownloadOptions,
  S3PresignedUrl,
  S3PresignUploadOptions
} from './types/file'

import { BYTES_PER_MB } from '../constants'
import { identityEquals, makeError } from './reducer-utils'

interface FileRowBase<Id> {
  contentType: string
  filename: string
  id: Id
  size: number
  storageKey: string
  uploadedAt: Timestamp
  userId: Identity
}

interface SenderLike {
  toHexString?: () => string
  toString?: () => string
}

const DEFAULT_ALLOWED_TYPES = new Set([
    'application/json',
    'application/msword',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/svg+xml',
    'image/webp',
    'text/csv',
    'text/plain'
  ]),
  DEFAULT_MAX_FILE_SIZE_MB = 10,
  CHUNK_SIZE_MB = 5,
  HEX_RADIX = 16,
  YEAR_LENGTH = 4,
  SECONDS_IN_MILLISECOND = 1000,
  MAX_PRESIGN_EXPIRY_SECONDS = 604_800,
  DEFAULT_MAX_FILE_SIZE = DEFAULT_MAX_FILE_SIZE_MB * BYTES_PER_MB,
  CHUNK_SIZE = CHUNK_SIZE_MB * BYTES_PER_MB,
  DEFAULT_PRESIGN_EXPIRY_SECONDS = 900,
  ZERO_PREFIX_REGEX = /^0x/u,
  TRAILING_SLASH_REGEX = /\/$/u,
  URI_EXTRA_REGEX = /[!'()*]/gu,
  normalizeHexIdentity = (sender: Identity): string => {
    const senderLike = sender as unknown as SenderLike,
      raw = typeof senderLike.toHexString === 'function' ? senderLike.toHexString() : (senderLike.toString?.() ?? '')
    return raw.trim().toLowerCase().replace(ZERO_PREFIX_REGEX, '')
  },
  isAuthenticatedSender = (sender: Identity): boolean => {
    const normalized = normalizeHexIdentity(sender)
    if (!normalized) return false
    for (const ch of normalized) if (ch !== '0') return true
    return false
  },
  encodeUriSegment = (value: string): string =>
    encodeURIComponent(value).replace(URI_EXTRA_REGEX, c => `%${c.codePointAt(0).toString(HEX_RADIX).toUpperCase()}`),
  encodeCanonicalPath = (value: string): string => {
    const segments = value.split('/'),
      out: string[] = []
    for (const segment of segments) out.push(encodeUriSegment(segment))
    if (value.startsWith('/')) return `/${out.join('/')}`
    return out.join('/')
  },
  toHex = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let hex = ''
    for (const byte of bytes) hex += byte.toString(HEX_RADIX).padStart(2, '0')
    return hex
  },
  toDateParts = (date: Date): { amzDate: string; dateStamp: string } => {
    const year = date.getUTCFullYear().toString().padStart(YEAR_LENGTH, '0'),
      month = (date.getUTCMonth() + 1).toString().padStart(2, '0'),
      day = date.getUTCDate().toString().padStart(2, '0'),
      hours = date.getUTCHours().toString().padStart(2, '0'),
      minutes = date.getUTCMinutes().toString().padStart(2, '0'),
      seconds = date.getUTCSeconds().toString().padStart(2, '0')
    return {
      amzDate: `${year}${month}${day}T${hours}${minutes}${seconds}Z`,
      dateStamp: `${year}${month}${day}`
    }
  },
  toCanonicalQuery = (params: Record<string, string>): string => {
    const keys = Object.keys(params).toSorted(),
      pairs: string[] = []
    for (const key of keys) pairs.push(`${encodeUriSegment(key)}=${encodeUriSegment(params[key] ?? '')}`)
    return pairs.join('&')
  },
  hmac = async (key: BufferSource, message: string): Promise<ArrayBuffer> => {
    const cryptoKey = await crypto.subtle.importKey('raw', key, { hash: 'SHA-256', name: 'HMAC' }, false, ['sign']),
      data = new TextEncoder().encode(message)
    return crypto.subtle.sign('HMAC', cryptoKey, data)
  },
  sha256Hex = async (value: string): Promise<string> => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
    return toHex(hash)
  },
  signingKey = async (secretAccessKey: string, dateStamp: string, region: string): Promise<ArrayBuffer> => {
    const kDate = await hmac(new TextEncoder().encode(`AWS4${secretAccessKey}`), dateStamp),
      kRegion = await hmac(kDate, region),
      kService = await hmac(kRegion, 's3')
    return hmac(kService, 'aws4_request')
  },
  toHost = (endpoint: URL): string => (endpoint.port ? `${endpoint.hostname}:${endpoint.port}` : endpoint.hostname),
  makePresignedRequest = async ({
    accessKeyId,
    bucket,
    contentType,
    endpoint,
    expiresInSeconds,
    key,
    method,
    region,
    secretAccessKey,
    sessionToken
  }: {
    accessKeyId: string
    bucket: string
    contentType?: string
    endpoint: string
    expiresInSeconds?: number
    key: string
    method: 'GET' | 'PUT'
    region: string
    secretAccessKey: string
    sessionToken?: string
  }): Promise<S3PresignedUrl> => {
    const now = new Date(),
      { amzDate, dateStamp } = toDateParts(now),
      normalizedExpiry = Math.max(
        1,
        Math.min(expiresInSeconds ?? DEFAULT_PRESIGN_EXPIRY_SECONDS, MAX_PRESIGN_EXPIRY_SECONDS)
      ),
      endpointUrl = new URL(endpoint),
      host = toHost(endpointUrl),
      pathPrefix = endpointUrl.pathname === '/' ? '' : endpointUrl.pathname.replace(TRAILING_SLASH_REGEX, ''),
      canonicalObjectPath = `${pathPrefix}/${encodeUriSegment(bucket)}/${key.split('/').map(encodeUriSegment).join('/')}`,
      canonicalUri = encodeCanonicalPath(canonicalObjectPath),
      credentialScope = `${dateStamp}/${region}/s3/aws4_request`,
      headers: Record<string, string> = {
        host
      },
      signedHeaderNames: string[] = ['host']

    if (contentType) {
      headers['content-type'] = contentType
      signedHeaderNames.push('content-type')
    }

    const canonicalHeaders = `${signedHeaderNames.map(name => `${name}:${headers[name]}`).join('\n')}\n`,
      signedHeaders = signedHeaderNames.join(';'),
      queryParams: Record<string, string> = {
        'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
        'X-Amz-Credential': `${accessKeyId}/${credentialScope}`,
        'X-Amz-Date': amzDate,
        'X-Amz-Expires': String(normalizedExpiry),
        'X-Amz-SignedHeaders': signedHeaders
      }

    if (sessionToken) queryParams['X-Amz-Security-Token'] = sessionToken

    const canonicalQuery = toCanonicalQuery(queryParams),
      canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\nUNSIGNED-PAYLOAD`,
      canonicalRequestHash = await sha256Hex(canonicalRequest),
      stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`,
      keyBytes = await signingKey(secretAccessKey, dateStamp, region),
      signature = toHex(await hmac(keyBytes, stringToSign)),
      finalQuery = `${canonicalQuery}&X-Amz-Signature=${signature}`,
      url = `${endpointUrl.protocol}//${host}${canonicalUri}?${finalQuery}`,
      clientHeaders: Record<string, string> = {}

    if (contentType) clientHeaders['content-type'] = contentType

    return {
      expiresAt: now.getTime() + normalizedExpiry * SECONDS_IN_MILLISECOND,
      headers: clientHeaders,
      key,
      method,
      url
    }
  },
  createS3UploadPresignedUrl = async (options: S3PresignUploadOptions): Promise<S3PresignedUrl> =>
    makePresignedRequest({ ...options, method: 'PUT' }),
  createS3DownloadPresignedUrl = async (options: S3PresignDownloadOptions): Promise<S3PresignedUrl> =>
    makePresignedRequest({ ...options, method: 'GET' }),
  makeFileUpload = <
    DB,
    Id,
    Row extends FileRowBase<Id>,
    Tbl extends FileUploadTableLike<Row>,
    Pk extends FileUploadPkLike<Row, Id>
  >(
    spacetimedb: {
      reducer: (
        opts: { name: string },
        params: Record<string, TypeBuilder<unknown, unknown>>,
        fn: (ctx: { db: DB; sender: Identity; timestamp: Timestamp }, args: unknown) => void
      ) => unknown
    },
    config: FileUploadConfig<DB, Row, Id, Tbl, Pk>
  ): FileUploadExports => {
    const {
        allowedTypes = DEFAULT_ALLOWED_TYPES,
        fields,
        idField,
        maxFileSize = DEFAULT_MAX_FILE_SIZE,
        namespace,
        pk: pkAccessor,
        table: tableAccessor
      } = config,
      registerName = `register_upload_${namespace}`,
      deleteName = `delete_file_${namespace}`,
      registerReducer = spacetimedb.reducer(
        { name: registerName },
        {
          contentType: fields.contentType as TypeBuilder<unknown, unknown>,
          filename: fields.filename as TypeBuilder<unknown, unknown>,
          size: fields.size as TypeBuilder<unknown, unknown>,
          storageKey: fields.storageKey as TypeBuilder<unknown, unknown>
        },
        (
          ctx,
          args: {
            contentType: string
            filename: string
            size: number
            storageKey: string
          }
        ) => {
          if (!isAuthenticatedSender(ctx.sender)) throw makeError('NOT_AUTHENTICATED', `${namespace}:register`)
          if (!allowedTypes.has(args.contentType))
            throw makeError('INVALID_FILE_TYPE', `File type ${args.contentType} not allowed`)
          if (args.size > maxFileSize)
            throw makeError('FILE_TOO_LARGE', `File size ${args.size} exceeds ${maxFileSize} bytes`)

          const table = tableAccessor(ctx.db)
          table.insert({
            contentType: args.contentType,
            filename: args.filename,
            id: 0 as Id,
            size: args.size,
            storageKey: args.storageKey,
            uploadedAt: ctx.timestamp,
            userId: ctx.sender
          } as Row)
        }
      ),
      deleteReducer = spacetimedb.reducer(
        { name: deleteName },
        {
          fileId: idField as TypeBuilder<unknown, unknown>
        },
        (ctx, { fileId }: { fileId: Id }) => {
          if (!isAuthenticatedSender(ctx.sender)) throw makeError('NOT_AUTHENTICATED', `${namespace}:delete`)
          const table = tableAccessor(ctx.db),
            pk = pkAccessor(table),
            row = pk.find(fileId)
          if (!row) throw makeError('NOT_FOUND', `${namespace}:delete`)
          if (!identityEquals(row.userId, ctx.sender)) throw makeError('FORBIDDEN', `${namespace}:delete`)
          const removed = pk.delete(fileId)
          if (!removed) throw makeError('NOT_FOUND', `${namespace}:delete`)
        }
      )

    return {
      exports: {
        [deleteName]: deleteReducer,
        [registerName]: registerReducer
      }
    }
  }

export {
  CHUNK_SIZE,
  createS3DownloadPresignedUrl,
  createS3UploadPresignedUrl,
  DEFAULT_ALLOWED_TYPES,
  DEFAULT_MAX_FILE_SIZE,
  makeFileUpload
}
