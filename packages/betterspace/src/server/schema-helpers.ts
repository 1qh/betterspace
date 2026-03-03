import type { ZodObject, ZodRawShape, ZodType } from 'zod/v4'

import type { BaseSchema, OrgSchema, OwnedSchema, SingletonSchema } from './types'

import { elementOf, isArrayType, unwrapZod } from '../zod'
import { isRecord } from './helpers'

interface IndexDef {
  fields: string[]
  name: string
}

interface SearchIndexDef {
  name: string
  searchField: string
}

interface TableDef {
  fields: Record<string, unknown>
  index: (name: string, fields: string[]) => TableDef
  indexes: IndexDef[]
  kind: 'base' | 'child' | 'org' | 'org-child' | 'owned' | 'singleton' | 'system'
  searchIndex: (name: string, config: { searchField: string }) => TableDef
  searchIndexes: SearchIndexDef[]
}

const tableDef = (kind: TableDef['kind'], fields: Record<string, unknown>): TableDef => {
    const indexes: IndexDef[] = [],
      searchIndexes: SearchIndexDef[] = []
    const table: TableDef = {
      fields,
      index: (name: string, fs: string[]) => {
        indexes.push({ fields: [...fs], name })
        return table
      },
      indexes,
      kind,
      searchIndex: (name: string, config: { searchField: string }) => {
        searchIndexes.push({ name, searchField: config.searchField })
        return table
      },
      searchIndexes
    }
    return table
  },
  zodShapeToFields = <T extends ZodRawShape>(shape: T): Record<string, string> => {
    const out: Record<string, string> = {},
      keys = Object.keys(shape)
    for (const k of keys) {
      const field = shape[k] as ZodType,
        { type } = unwrapZod(field)
      out[k] = type || 'unknown'
    }
    return out
  },
  baseTable = <T extends ZodRawShape>(s: BaseSchema<T>) =>
    tableDef('base', {
      ...zodShapeToFields(s.shape),
      updatedAt: 'number'
    }),
  ownedTable = <T extends ZodRawShape>(s: OwnedSchema<T>) =>
    tableDef('owned', {
      ...zodShapeToFields(s.shape),
      updatedAt: 'number',
      userId: 'identity'
    }).index('by_user', ['userId']),
  singletonTable = <T extends ZodRawShape>(s: SingletonSchema<T>) =>
    tableDef('singleton', {
      ...zodShapeToFields(s.shape),
      updatedAt: 'number',
      userId: 'identity'
    }).index('by_user', ['userId']),
  orgTable = <T extends ZodRawShape>(s: OrgSchema<T>) =>
    tableDef('org', {
      ...zodShapeToFields(s.shape),
      orgId: 'u32',
      updatedAt: 'number',
      userId: 'identity'
    })
      .index('by_org', ['orgId'])
      .index('by_org_user', ['orgId', 'userId']),
  orgChildTable = <T extends ZodRawShape>(
    s: OrgSchema<T>,
    parent: {
      foreignKey: string
      table: string
    }
  ) =>
    tableDef('org-child', {
      ...zodShapeToFields(s.shape),
      orgId: 'u32',
      updatedAt: 'number',
      userId: 'identity'
    })
      .index('by_org', ['orgId'])
      .index('by_parent', [parent.foreignKey]),
  childTable = <T extends ZodRawShape>(s: ZodObject<T>, indexField: string, indexName?: string) =>
    tableDef('child', {
      ...zodShapeToFields(s.shape),
      updatedAt: 'number'
    }).index(indexName ?? `by_${indexField}`, [indexField]),
  orgTables = () => ({
    org: tableDef('system', {
      avatarId: 'string?',
      name: 'string',
      slug: 'string',
      updatedAt: 'number',
      userId: 'identity'
    })
      .index('by_slug', ['slug'])
      .index('by_user', ['userId']),
    orgInvite: tableDef('system', {
      email: 'string',
      expiresAt: 'number',
      isAdmin: 'boolean',
      orgId: 'u32',
      token: 'string'
    })
      .index('by_org', ['orgId'])
      .index('by_token', ['token']),
    orgJoinRequest: tableDef('system', {
      message: 'string?',
      orgId: 'u32',
      status: 'pending|approved|rejected',
      userId: 'identity'
    })
      .index('by_org', ['orgId'])
      .index('by_org_status', ['orgId', 'status'])
      .index('by_user', ['userId']),
    orgMember: tableDef('system', {
      isAdmin: 'boolean',
      orgId: 'u32',
      updatedAt: 'number',
      userId: 'identity'
    })
      .index('by_org', ['orgId'])
      .index('by_org_user', ['orgId', 'userId'])
      .index('by_user', ['userId'])
  }),
  rateLimitTable = () => ({
    rateLimit: tableDef('system', {
      count: 'number',
      key: 'string',
      table: 'string',
      windowStart: 'number'
    }).index('by_table_key', ['table', 'key'])
  }),
  uploadTables = () => ({
    uploadChunk: tableDef('system', {
      chunkIndex: 'number',
      storageId: 'string',
      totalChunks: 'number',
      uploadId: 'string',
      userId: 'identity'
    })
      .index('by_upload', ['uploadId'])
      .index('by_user', ['userId']),
    uploadRateLimit: tableDef('system', {
      count: 'number',
      userId: 'identity',
      windowStart: 'number'
    }).index('by_user', ['userId']),
    uploadSession: tableDef('system', {
      completedChunks: 'number',
      contentType: 'string',
      fileName: 'string',
      finalStorageId: 'string?',
      status: 'pending|assembling|completed|failed',
      totalChunks: 'number',
      totalSize: 'number',
      uploadId: 'string',
      userId: 'identity'
    })
      .index('by_upload_id', ['uploadId'])
      .index('by_user', ['userId'])
  })

interface CheckSchemaOutput {
  path: string
  zodType: string
}

const unsupportedTypes = new Set(['pipe', 'transform']),
  scanSchema = (schema: unknown, path: string, out: CheckSchemaOutput[]) => {
    const b = unwrapZod(schema)
    if (b.type && unsupportedTypes.has(b.type)) out.push({ path, zodType: b.type })
    if (isArrayType(b.type)) return scanSchema(elementOf(b.schema), `${path}[]`, out)
    if (b.type === 'object' && b.schema && isRecord((b.schema as unknown as { shape?: unknown }).shape)) {
      for (const [k, vl] of Object.entries((b.schema as unknown as { shape: Record<string, unknown> }).shape)) {
        scanSchema(vl, path ? `${path}.${k}` : k, out)
      }
    }
  },
  checkSchema = (schemas: Record<string, ZodObject<ZodRawShape>>) => {
    const res: CheckSchemaOutput[] = []
    for (const [table, schema] of Object.entries(schemas)) scanSchema(schema, table, res)
    if (res.length > 0) {
      for (const f of res) process.stderr.write(`${f.path}: unsupported zod type "${f.zodType}"\n`)
      process.exitCode = 1
    }
  }

export {
  baseTable,
  checkSchema,
  childTable,
  orgChildTable,
  orgTable,
  orgTables,
  ownedTable,
  rateLimitTable,
  singletonTable,
  uploadTables
}
