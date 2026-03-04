// biome-ignore-all lint/performance/noAwaitInLoops: e2e sequential
// biome-ignore-all lint/nursery/useNamedCaptureGroup: regex patterns
// biome-ignore-all lint/style/noProcessEnv: e2e env
// biome-ignore-all lint/suspicious/useAwait: async without await
// oxlint-disable no-await-in-loop
// oxlint-disable complexity
// oxlint-disable no-await-expression-member
import type { api as BeApi } from '@a/be'
import type { Id } from '@a/be/model'

interface FunctionLikeReference {
  [key: string]: unknown
  [key: symbol]: unknown
}

interface IdentityResponse {
  identity: string
  token: string
}

interface SchemaName {
  some?: string
}

type AlgebraicType = Record<string, unknown>

interface SchemaElement {
  algebraic_type?: AlgebraicType
  name?: SchemaName
}

interface ReducerSchema {
  name?: string
  params?: { elements?: SchemaElement[] }
}

interface SchemaResponse {
  reducers?: ReducerSchema[]
}

interface SqlResultSet {
  rows?: unknown[][]
  schema?: { elements?: SchemaElement[] }
}

const FUNCTION_NAME = Symbol.for('functionName')
const ERROR_CODE_RE = /\{"code":"([^"]+)"[^}]*\}/u
const HEX_PREFIX_RE = /^0x/iu

const makeApiProxy = (parts: string[] = []): unknown =>
  new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === FUNCTION_NAME) return parts.join(':')
        if (typeof key !== 'string') return null
        return makeApiProxy([...parts, key])
      }
    }
  )

const api = makeApiProxy() as unknown as typeof BeApi
const identityCache = new Map<string, IdentityResponse>()
const identityKeyByUserId = new Map<string, string>()
const emailByUserId = new Map<string, string>()

const getHost = () => process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? 'http://localhost:3000'
const getModule = () => process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE ?? 'betterspace'
const makeCodeError = (code: string): Error => new Error(JSON.stringify({ code }))

const ORG_LIFECYCLE_ACTIONS = new Set([
  'create',
  'update',
  'remove',
  'set_admin',
  'remove_member',
  'leave',
  'transfer_ownership',
  'send_invite',
  'accept_invite',
  'revoke_invite',
  'request_join',
  'approve_join',
  'reject_join',
  'cancel_join'
])

const toSnake = (s: string): string => s.replaceAll(/[A-Z]/gu, m => `_${m.toLowerCase()}`)
const toCamel = (s: string): string => s.replaceAll(/_([a-z])/gu, (_m, c: string) => c.toUpperCase())

const toReducerName = (name: string): string => {
  if (name.includes('_')) return name
  const parts = name.split(':')
  const mod = parts[0] ?? ''
  const fn = parts[1] ?? ''
  if (mod.length === 0 || fn.length === 0) return name
  if (name === 'org:invite') return 'org_send_invite'
  const snakeFn = toSnake(fn)
  if (mod === 'org' && ORG_LIFECYCLE_ACTIONS.has(snakeFn)) return `org_${snakeFn}`
  return `${snakeFn}_${mod}`
}

const parseJson = async <T>(response: Response): Promise<T> => {
  const text = await response.text()
  if (!response.ok) {
    if (text.trim().length > 0) throw new Error(text)
    throw new Error(response.statusText)
  }
  if (text.trim().length === 0) return null as T
  return JSON.parse(text) as T
}

const getTokenFor = async (key: string): Promise<IdentityResponse> => {
  const existing = identityCache.get(key)
  if (existing) return existing
  const response = await fetch(`${getHost()}/v1/identity`, { method: 'POST' })
  const created = await parseJson<IdentityResponse>(response)
  identityCache.set(key, created)
  identityKeyByUserId.set(created.identity, key)
  return created
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const getHeaderValue = (): string => process.env.SPACETIMEDB_TEST_MODE ?? 'true'

let reducerParamsPromise: null | Promise<Map<string, SchemaElement[]>> = null

const getReducerParams = async (): Promise<Map<string, SchemaElement[]>> => {
  if (reducerParamsPromise !== null) return reducerParamsPromise
  reducerParamsPromise = (async () => {
    const response = await fetch(`${getHost()}/v1/database/${getModule()}/schema?version=9`)
    const schema = await parseJson<SchemaResponse>(response)
    const map = new Map<string, SchemaElement[]>()
    const reducers = schema.reducers ?? []
    for (const reducer of reducers) {
      const reducerName = reducer.name
      if (reducerName) map.set(reducerName, reducer.params?.elements ?? [])
    }
    return map
  })()
  return reducerParamsPromise
}

const getFunctionName = (f: unknown): string => {
  if (!f || typeof f !== 'object') throw makeCodeError('INVALID_FUNCTION_REFERENCE')
  const raw = (f as FunctionLikeReference)[FUNCTION_NAME]
  if (typeof raw !== 'string' || raw.length === 0) throw makeCodeError('INVALID_FUNCTION_REFERENCE')
  return raw
}

const extractSumType = (type: unknown): null | { variants: unknown[] } => {
  if (!isRecord(type)) return null
  const sum = type.Sum
  if (!isRecord(sum)) return null
  const { variants } = sum
  if (!Array.isArray(variants)) return null
  return { variants }
}

const optionVariantNames = (type: unknown): null | { noneIndex: number; someIndex: number; someType: unknown } => {
  const sum = extractSumType(type)
  if (!sum) return null
  let noneIndex = -1
  let someIndex = -1
  let someType: unknown
  for (let i = 0; i < sum.variants.length; i += 1) {
    const variant = sum.variants[i]
    if (isRecord(variant)) {
      const rawName = variant.name
      if (isRecord(rawName)) {
        const name = rawName.some
        if (name === 'none') noneIndex = i
        if (name === 'some') {
          someIndex = i
          someType = variant.algebraic_type
        }
      }
    }
  }
  if (noneIndex === -1 || someIndex === -1) return null
  return { noneIndex, someIndex, someType }
}

const encodeArg = (type: unknown, value: unknown): unknown => {
  const optionInfo = optionVariantNames(type)
  if (optionInfo) {
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') return value
    if (value === null || value === undefined) return [optionInfo.noneIndex, []]
    return [optionInfo.someIndex, encodeArg(optionInfo.someType, value)]
  }
  if (isRecord(type) && 'Product' in type) {
    const product = type.Product
    if (!isRecord(product)) return value
    const { elements } = product
    if (!Array.isArray(elements)) return value
    if (Array.isArray(value)) return value
    if (elements.length !== 1) return value
    const [first] = elements
    if (!isRecord(first)) return [value]
    return [encodeArg(first.algebraic_type, value)]
  }
  if (isRecord(type)) {
    const numericKeys = ['I8', 'I16', 'I32', 'I64', 'U8', 'U16', 'U32', 'U64']
    for (const key of numericKeys) {
      if (key in type && typeof value === 'string') return Number.parseInt(value, 10)
    }
  }
  return value
}

const normalizeArgs = async (reducer: string, args: Record<string, unknown>): Promise<unknown[]> => {
  const reducerParams = await getReducerParams()
  const params = reducerParams.get(reducer)
  if (!params) throw makeCodeError('NOT_IMPLEMENTED')
  const out: unknown[] = []
  for (const param of params) {
    const rawName = param.name?.some
    if (rawName) out.push(encodeArg(param.algebraic_type, args[rawName]))
    else out.push(null)
  }
  return out
}

const callReducer = async <T>(reducer: string, args: Record<string, unknown>, identityKey = 'default'): Promise<T> => {
  const payload = await normalizeArgs(reducer, args)
  const { token } = await getTokenFor(identityKey)
  const response = await fetch(`${getHost()}/v1/database/${getModule()}/call/${reducer}`, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-spacetimedb-test-mode': getHeaderValue()
    },
    method: 'POST'
  })
  const text = await response.text()
  if (!response.ok) {
    if (text.trim().length > 0) throw new Error(text)
    throw makeCodeError('REDUCER_CALL_FAILED')
  }
  if (text.trim().length === 0) return null as T
  return JSON.parse(text) as T
}

const decodeValue = (type: unknown, value: unknown): unknown => {
  if (!isRecord(type)) return value

  if ('Sum' in type) {
    const sum = type.Sum
    if (!isRecord(sum)) return value
    const variantsRaw = sum.variants
    if (!Array.isArray(variantsRaw)) return value
    if (Array.isArray(value) && value.length === 2 && typeof value[0] === 'number') {
      const variant = variantsRaw[value[0]]
      const [, payload] = value
      if (!isRecord(variant)) return payload
      const rawName = variant.name
      const variantType = variant.algebraic_type
      if (!isRecord(rawName)) return decodeValue(variantType, payload)
      const variantName = rawName.some
      if (variantName === 'none') return null
      if (variantName === 'some') return decodeValue(variantType, payload)
      return { tag: variantName, value: decodeValue(variantType, payload) }
    }
    if (isRecord(value)) {
      const keys = Object.keys(value)
      if (keys.length === 1) {
        const key = keys[0] ?? ''
        if (key === 'none') return null
        if (key === 'some') return decodeValue(undefined, value[key])
      }
    }
    return value
  }

  if ('Product' in type) {
    const product = type.Product
    if (!isRecord(product)) return value
    const elementsRaw = product.elements
    if (!Array.isArray(elementsRaw)) return value
    if (!Array.isArray(value)) return value
    if (elementsRaw.length === 1) {
      const [first] = elementsRaw
      if (!isRecord(first)) return value[0]
      const rawName = first.name
      const innerType = first.algebraic_type
      const [firstValue] = value
      if (isRecord(rawName)) {
        const name = rawName.some
        if (name === '__identity__' || name === '__timestamp_micros_since_unix_epoch__')
          return decodeValue(innerType, firstValue)
      }
      return decodeValue(innerType, firstValue)
    }
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < elementsRaw.length; i += 1) {
      const element = elementsRaw[i]
      if (isRecord(element)) {
        const rawName = element.name
        if (isRecord(rawName)) {
          const name = rawName.some
          if (name) {
            obj[toCamel(name)] = decodeValue(element.algebraic_type, value[i])
          }
        }
      }
    }
    return obj
  }

  if ('Array' in type) {
    if (!Array.isArray(value)) return value
    const arrayType = type.Array
    let elementType: unknown
    if (isRecord(arrayType) && 'elem_ty' in arrayType) elementType = arrayType.elem_ty
    const out: unknown[] = []
    for (const item of value) out.push(decodeValue(elementType, item))
    return out
  }

  return value
}

const querySQL = async <T>(sql: string): Promise<T[]> => {
  const response = await fetch(`${getHost()}/v1/database/${getModule()}/sql`, {
    body: sql,
    headers: {
      'Content-Type': 'text/plain',
      'x-spacetimedb-test-mode': getHeaderValue()
    },
    method: 'POST'
  })
  const result = await parseJson<SqlResultSet[]>(response)
  const [first] = result
  if (!first) return []
  const elements = first.schema?.elements ?? []
  const rows = first.rows ?? []
  const mapped: T[] = []
  for (const row of rows) {
    const entry: Record<string, unknown> = {}
    for (let i = 0; i < elements.length; i += 1) {
      const name = elements[i]?.name?.some
      if (name) {
        entry[toCamel(name)] = decodeValue(elements[i]?.algebraic_type, row[i])
      }
    }
    mapped.push(entry as T)
  }
  return mapped
}

const toId = (value: unknown): string => String(value ?? '')
const normalizeIdentity = (value: string): string => value.replace(HEX_PREFIX_RE, '').toLowerCase()
const sameIdentity = (a: string, b: string): boolean => normalizeIdentity(a) === normalizeIdentity(b)
const toInt = (value: unknown): number => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number.parseInt(value, 10)
  return Number.NaN
}

const escapeSqlString = (value: string): string => value.replaceAll("'", "''")

const getClient = () => ({ host: getHost(), moduleName: getModule() })

const extractErrorCode = (e: unknown): null | { code: string } => {
  if (e instanceof Error) {
    const match = ERROR_CODE_RE.exec(e.message)
    if (match?.[1]) return { code: match[1] }
    if (e.message.includes('NOT_IMPLEMENTED')) return { code: 'NOT_IMPLEMENTED' }
    if (e.message.includes('Validation') || e.message.includes('validation')) return { code: 'VALIDATION_ERROR' }
  }
  return null
}

const expectError = async <T>(fn: () => Promise<T>): Promise<T> => {
  try {
    return await fn()
  } catch (error) {
    const parsed = extractErrorCode(error)
    if (parsed) return parsed as T
    throw error
  }
}

const getCurrentIdentity = async (identityKey = 'default'): Promise<string> => (await getTokenFor(identityKey)).identity

const querySingle = async <T>(sql: string): Promise<null | T> => {
  const rows = await querySQL<T>(sql)
  const [first] = rows
  if (!first) return null
  return first
}

const mapOrg = (row: Record<string, unknown>) => ({
  _id: toId(row.id),
  avatarId: row.avatarId,
  name: String(row.name ?? ''),
  slug: String(row.slug ?? ''),
  updatedAt: row.updatedAt,
  userId: toId(row.userId)
})

const getOrgById = async (orgId: string) => {
  const id = toInt(orgId)
  if (!Number.isFinite(id)) return null
  const row = await querySingle<Record<string, unknown>>(`SELECT * FROM org WHERE id = ${id}`)
  if (!row) return null
  return mapOrg(row)
}

const getOrgBySlug = async (slug: string) => {
  const row = await querySingle<Record<string, unknown>>(`SELECT * FROM org WHERE slug = '${escapeSqlString(slug)}'`)
  if (!row) return null
  return mapOrg(row)
}

const getOrgMembers = async (orgId: string) => {
  const id = toInt(orgId)
  if (!Number.isFinite(id)) return []
  const rows = await querySQL<Record<string, unknown>>(`SELECT * FROM org_member WHERE org_id = ${id}`)
  const org = await getOrgById(orgId)
  const members: Record<string, unknown>[] = []
  let ownerFound = false
  for (const row of rows) {
    const userId = toId(row.userId)
    if (org && sameIdentity(org.userId, userId)) ownerFound = true
    const role = org && sameIdentity(org.userId, userId) ? 'owner' : row.isAdmin ? 'admin' : 'member'
    members.push({
      _id: toId(row.id),
      isAdmin: Boolean(row.isAdmin),
      orgId: toId(row.orgId),
      role,
      userId
    })
  }
  if (org && !ownerFound) {
    members.push({
      _id: `owner:${org._id}`,
      isAdmin: true,
      orgId: org._id,
      role: 'owner',
      userId: org.userId
    })
  }
  return members
}

const getMembership = async (orgId: string, identityKey = 'default') => {
  const id = toInt(orgId)
  if (!Number.isFinite(id)) return null
  const userId = await getCurrentIdentity(identityKey)
  const row = await querySingle<Record<string, unknown>>(
    `SELECT * FROM org_member WHERE org_id = ${id} AND user_id = '${escapeSqlString(userId)}'`
  )
  const org = await getOrgById(orgId)
  if (!row) {
    if (org && sameIdentity(org.userId, userId)) {
      return {
        _id: `owner:${org._id}`,
        isAdmin: true,
        orgId: org._id,
        role: 'owner',
        userId
      }
    }
    return null
  }
  return {
    _id: toId(row.id),
    isAdmin: Boolean(row.isAdmin),
    orgId: toId(row.orgId),
    role: org && sameIdentity(org.userId, userId) ? 'owner' : row.isAdmin ? 'admin' : 'member',
    userId
  }
}

const getMyOrgs = async (identityKey = 'default') => {
  const userId = await getCurrentIdentity(identityKey)
  const owned = await querySQL<Record<string, unknown>>(`SELECT * FROM org WHERE user_id = '${escapeSqlString(userId)}'`)
  const rows = await querySQL<Record<string, unknown>>(
    `SELECT * FROM org_member WHERE user_id = '${escapeSqlString(userId)}'`
  )
  const out: Record<string, unknown>[] = []
  for (const row of owned) {
    out.push({
      memberId: `owner:${toId(row.id)}`,
      org: mapOrg(row),
      role: 'owner'
    })
  }
  for (const row of rows) {
    const org = await getOrgById(toId(row.orgId))
    if (org && !sameIdentity(org.userId, userId)) {
      const role = row.isAdmin ? 'admin' : 'member'
      out.push({
        memberId: toId(row.id),
        org,
        role
      })
    }
  }
  return out
}

const getPendingInvites = async (orgId: string) => {
  const id = toInt(orgId)
  if (!Number.isFinite(id)) return []
  const rows = await querySQL<Record<string, unknown>>(`SELECT * FROM org_invite WHERE org_id = ${id}`)
  const invites: Record<string, unknown>[] = []
  for (const row of rows) {
    invites.push({
      _id: toId(row.id),
      email: String(row.email ?? ''),
      expiresAt: row.expiresAt,
      inviteId: toId(row.id),
      isAdmin: Boolean(row.isAdmin),
      orgId: toId(row.orgId),
      token: String(row.token ?? '')
    })
  }
  return invites
}

const mapProject = (row: Record<string, unknown>) => ({
  _id: toId(row.id),
  description: row.description,
  editors: row.editors,
  name: String(row.name ?? ''),
  orgId: toId(row.orgId),
  status: row.status,
  updatedAt: row.updatedAt,
  userId: toId(row.userId)
})

const getProjectById = async (id: string, orgId: string) => {
  const parsedId = toInt(id)
  const parsedOrgId = toInt(orgId)
  if (!(Number.isFinite(parsedId) && Number.isFinite(parsedOrgId))) return null
  const row = await querySingle<Record<string, unknown>>(
    `SELECT * FROM project WHERE id = ${parsedId} AND org_id = ${parsedOrgId}`
  )
  if (!row) return null
  return mapProject(row)
}

const listProjects = async (orgId: string, numItems: number) => {
  const parsedOrgId = toInt(orgId)
  if (!Number.isFinite(parsedOrgId)) return { continueCursor: null, isDone: true, page: [] }
  const rows = await querySQL<Record<string, unknown>>(
    `SELECT * FROM project WHERE org_id = ${parsedOrgId} LIMIT ${numItems}`
  )
  const page: Record<string, unknown>[] = []
  for (const row of rows) page.push(mapProject(row))
  return { continueCursor: null, isDone: true, page }
}

const mapTask = (row: Record<string, unknown>) => ({
  _id: toId(row.id),
  assigneeId: row.assigneeId,
  completed: Boolean(row.completed),
  orgId: toId(row.orgId),
  priority: row.priority,
  projectId: toId(row.projectId),
  title: String(row.title ?? ''),
  updatedAt: row.updatedAt,
  userId: toId(row.userId)
})

const getTaskById = async (id: string, orgId: string) => {
  const parsedId = toInt(id)
  const parsedOrgId = toInt(orgId)
  if (!(Number.isFinite(parsedId) && Number.isFinite(parsedOrgId))) return null
  const row = await querySingle<Record<string, unknown>>(
    `SELECT * FROM task WHERE id = ${parsedId} AND org_id = ${parsedOrgId}`
  )
  if (!row) return null
  return mapTask(row)
}

const mapWiki = (row: Record<string, unknown>) => ({
  _id: toId(row.id),
  content: row.content,
  deletedAt: row.deletedAt === null ? undefined : row.deletedAt,
  editors: row.editors,
  orgId: toId(row.orgId),
  slug: String(row.slug ?? ''),
  status: row.status,
  title: String(row.title ?? ''),
  updatedAt: row.updatedAt,
  userId: toId(row.userId)
})

const getWikiById = async (id: string, orgId: string) => {
  const parsedId = toInt(id)
  const parsedOrgId = toInt(orgId)
  if (!(Number.isFinite(parsedId) && Number.isFinite(parsedOrgId))) return null
  const row = await querySingle<Record<string, unknown>>(
    `SELECT * FROM wiki WHERE id = ${parsedId} AND org_id = ${parsedOrgId}`
  )
  if (!row) return null
  return mapWiki(row)
}

const listWikis = async (orgId: string, numItems: number) => {
  const parsedOrgId = toInt(orgId)
  if (!Number.isFinite(parsedOrgId)) return { continueCursor: null, isDone: true, page: [] }
  const rows = await querySQL<Record<string, unknown>>(
    `SELECT * FROM wiki WHERE org_id = ${parsedOrgId} LIMIT ${numItems}`
  )
  const page: Record<string, unknown>[] = []
  for (const row of rows) {
    const mapped = mapWiki(row)
    if (mapped.deletedAt === undefined) page.push(mapped)
  }
  return { continueCursor: null, isDone: true, page }
}

const createTestOrg = async (slug: string, name: string) => {
  const existing = await getOrgBySlug(slug)
  if (existing) throw makeCodeError('ORG_SLUG_TAKEN')
  await callReducer('org_create', { avatarId: null, name, slug })
  const created = await getOrgBySlug(slug)
  if (!created) throw makeCodeError('NOT_FOUND')
  return { orgId: created._id }
}

const createTestUser = async (email: string, name: string) => {
  const key = `user:${email}`
  const created = await getTokenFor(key)
  const identity = created.identity.startsWith('0x') ? created.identity : `0x${created.identity}`
  identityKeyByUserId.set(created.identity, key)
  identityKeyByUserId.set(identity, key)
  emailByUserId.set(created.identity, email)
  emailByUserId.set(identity, email)
  await callReducer('upsert_orgProfile', { displayName: name }, key)
  return identity as unknown as Id<'users'>
}

const pickLatestInvite = (invites: Record<string, unknown>[]) => {
  let latest: null | Record<string, unknown> = null
  let latestId = -1
  for (const invite of invites) {
    const id = toInt(invite.id)
    if (Number.isFinite(id) && id > latestId) {
      latestId = id
      latest = invite
    }
  }
  return latest
}

const pickLatestById = (rows: Record<string, unknown>[]) => {
  let latest: null | Record<string, unknown> = null
  let latestId = -1
  for (const row of rows) {
    const id = toInt(row.id)
    if (Number.isFinite(id) && id > latestId) {
      latestId = id
      latest = row
    }
  }
  return latest
}

const addTestOrgMember = async (orgId: Id<'org'> | string, userId: Id<'users'> | string, isAdmin: boolean) => {
  const userIdString = String(userId)
  const orgIdString = String(orgId)
  const email = emailByUserId.get(userIdString) ?? `${userIdString}@test.local`
  await callReducer('org_send_invite', { email, isAdmin, orgId: toInt(orgIdString) })
  const invites = await querySQL<Record<string, unknown>>(
    `SELECT * FROM org_invite WHERE org_id = ${toInt(orgIdString)} AND email = '${escapeSqlString(email)}'`
  )
  const invite = pickLatestInvite(invites)
  if (!invite) throw makeCodeError('NOT_FOUND')
  const identityKey = identityKeyByUserId.get(userIdString) ?? `user:${email}`
  await callReducer('org_accept_invite', { token: String(invite.token ?? '') }, identityKey)
  const member = await querySingle<Record<string, unknown>>(
    `SELECT * FROM org_member WHERE org_id = ${toInt(orgIdString)} AND user_id = '${escapeSqlString(userIdString)}'`
  )
  if (!member) throw makeCodeError('NOT_FOUND')
  if (isAdmin && !member.isAdmin) {
    await callReducer('org_set_admin', { isAdmin: true, memberId: toInt(member.id) })
  }
  return toId(member.id)
}

const removeTestOrgMember = async (orgId: Id<'org'> | string, userId: Id<'users'> | string) => {
  const userIdString = String(userId)
  const key = identityKeyByUserId.get(userIdString)
  if (key) {
    await callReducer('org_leave', { orgId: toInt(String(orgId)) }, key)
    return
  }
  const member = await querySingle<Record<string, unknown>>(
    `SELECT * FROM org_member WHERE org_id = ${toInt(String(orgId))} AND user_id = '${escapeSqlString(userIdString)}'`
  )
  if (!member) return
  await callReducer('org_remove_member', { memberId: toInt(member.id) })
}

const runQuery = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  if (name === 'org:get') return (await getOrgById(String(args.orgId ?? ''))) as T
  if (name === 'org:getBySlug') return (await getOrgBySlug(String(args.slug ?? ''))) as T
  if (name === 'org:members') return (await getOrgMembers(String(args.orgId ?? ''))) as T
  if (name === 'org:membership') return (await getMembership(String(args.orgId ?? ''))) as T
  if (name === 'org:myOrgs') return (await getMyOrgs()) as T
  if (name === 'org:pendingInvites') return (await getPendingInvites(String(args.orgId ?? ''))) as T
  if (name === 'project:read') {
    const project = await getProjectById(String(args.id ?? ''), String(args.orgId ?? ''))
    if (!project) throw makeCodeError('NOT_FOUND')
    return project as T
  }
  if (name === 'project:list') {
    const { paginationOpts } = args
    let numItems = 50
    if (isRecord(paginationOpts) && typeof paginationOpts.numItems === 'number') {
      const { numItems: n } = paginationOpts
      numItems = n as number
    }
    return (await listProjects(String(args.orgId ?? ''), numItems)) as T
  }
  if (name === 'task:read') {
    const task = await getTaskById(String(args.id ?? ''), String(args.orgId ?? ''))
    if (!task) throw makeCodeError('NOT_FOUND')
    return task as T
  }
  if (name === 'wiki:read') {
    const wiki = await getWikiById(String(args.id ?? ''), String(args.orgId ?? ''))
    if (!wiki) throw makeCodeError('NOT_FOUND')
    return wiki as T
  }
  if (name === 'wiki:list') {
    const { paginationOpts } = args
    let numItems = 50
    if (isRecord(paginationOpts) && typeof paginationOpts.numItems === 'number') {
      const { numItems: n } = paginationOpts
      numItems = n as number
    }
    return (await listWikis(String(args.orgId ?? ''), numItems)) as T
  }
  if (name === 'orgProfile:get') {
    const identity = await getCurrentIdentity()
    const row = await querySingle<Record<string, unknown>>(
      `SELECT * FROM org_profile WHERE user_id = '${escapeSqlString(identity)}'`
    )
    if (!row) return null as T
    return {
      avatar: row.avatar,
      bio: row.bio,
      displayName: row.displayName,
      notifications: row.notifications,
      theme: row.theme,
      updatedAt: row.updatedAt,
      userId: row.userId
    } as T
  }
  return callReducer<T>(toReducerName(name), args)
}

const runMutation = async <T>(name: string, args: Record<string, unknown>): Promise<T> => {
  if (name === 'project:bulkRm') {
    const ids = Array.isArray(args.ids) ? args.ids : []
    let deleted = 0
    for (const id of ids) {
      await callReducer('rm_project', { id: toInt(id) })
      deleted += 1
    }
    return deleted as T
  }

  if (name === 'project:rm') {
    const projectId = toInt(args.id)
    const orgId = toInt(args.orgId)
    const tasks = await querySQL<Record<string, unknown>>(
      `SELECT * FROM task WHERE org_id = ${orgId} AND project_id = ${projectId}`
    )
    for (const task of tasks) await callReducer('rm_task', { id: toInt(task.id) })
    return callReducer<T>('rm_project', { id: projectId })
  }

  if (name === 'wiki:bulkRm') {
    const ids = Array.isArray(args.ids) ? args.ids : []
    let deleted = 0
    for (const id of ids) {
      await callReducer('rm_wiki', { id: toInt(id) })
      deleted += 1
    }
    return deleted as T
  }

  if (name === 'task:toggle') {
    const task = await getTaskById(String(args.id ?? ''), String(args.orgId ?? ''))
    if (!task) throw makeCodeError('NOT_FOUND')
    await callReducer('update_task', {
      completed: !task.completed,
      id: toInt(task._id)
    })
    const updated = await getTaskById(task._id, task.orgId)
    if (!updated) throw makeCodeError('NOT_FOUND')
    return updated as T
  }

  if (name === 'wiki:restore') {
    const wiki = await getWikiById(String(args.id ?? ''), String(args.orgId ?? ''))
    if (!wiki) throw makeCodeError('NOT_FOUND')
    await callReducer('update_wiki', {
      content: wiki.content,
      deletedAt: null,
      id: toInt(wiki._id),
      slug: wiki.slug,
      status: wiki.status,
      title: wiki.title
    })
    return null as T
  }

  if (name === 'org:acceptInvite') {
    const token = String(args.token ?? '')
    const invite = await querySingle<Record<string, unknown>>(
      `SELECT * FROM org_invite WHERE token = '${escapeSqlString(token)}'`
    )
    if (!invite) throw makeCodeError('INVALID_INVITE')
  }

  if (name === 'testauth:requestJoinAsUser') {
    const userId = String(args.userId ?? '')
    const orgId = toInt(args.orgId)
    const message = String(args.message ?? '')
    const key = identityKeyByUserId.get(userId)
    if (!key) throw makeCodeError('NOT_FOUND')
    await callReducer('org_request_join', { message, orgId }, key)
    return null as T
  }

  if (name === 'org:create' && isRecord(args.data)) {
    const existing = await getOrgBySlug(String(args.data.slug ?? ''))
    if (existing) throw makeCodeError('ORG_SLUG_TAKEN')
    const payload: Record<string, unknown> = {
      avatarId: args.data.avatarId,
      name: args.data.name,
      slug: args.data.slug
    }
    await callReducer('org_create', payload)
    const org = await getOrgBySlug(String(payload.slug ?? ''))
    if (!org) throw makeCodeError('NOT_FOUND')
    return { orgId: org._id } as T
  }

  if (name === 'org:update' && isRecord(args.data)) {
    const payload: Record<string, unknown> = {
      avatarId: args.data.avatarId,
      name: args.data.name,
      orgId: toInt(args.orgId),
      slug: args.data.slug
    }
    await callReducer('org_update', payload)
    const org = await getOrgById(String(args.orgId ?? ''))
    if (!org) throw makeCodeError('NOT_FOUND')
    return org as T
  }

  const reducerName = toReducerName(name)
  const result = await callReducer<T>(reducerName, args)
  if (name === 'project:create') {
    const rows = await querySQL<Record<string, unknown>>(
      `SELECT * FROM project WHERE org_id = ${toInt(args.orgId)} AND name = '${escapeSqlString(String(args.name ?? ''))}'`
    )
    const created = pickLatestById(rows)
    if (!created) throw makeCodeError('NOT_FOUND')
    return toId(created.id) as T
  }
  if (name === 'task:create') {
    const rows = await querySQL<Record<string, unknown>>(
      `SELECT * FROM task WHERE org_id = ${toInt(args.orgId)} AND project_id = ${toInt(args.projectId)} AND title = '${escapeSqlString(String(args.title ?? ''))}'`
    )
    const created = pickLatestById(rows)
    if (!created) throw makeCodeError('NOT_FOUND')
    return toId(created.id) as T
  }
  if (name === 'wiki:create') {
    const rows = await querySQL<Record<string, unknown>>(
      `SELECT * FROM wiki WHERE org_id = ${toInt(args.orgId)} AND slug = '${escapeSqlString(String(args.slug ?? ''))}'`
    )
    const created = pickLatestById(rows)
    if (!created) throw makeCodeError('NOT_FOUND')
    return toId(created.id) as T
  }
  if (name === 'org:invite') {
    const invites = await getPendingInvites(String(args.orgId ?? ''))
    let found: null | Record<string, unknown> = null
    for (const invite of invites) {
      if (invite.email === args.email) found = invite
    }
    if (found) return found as T
  }
  if (name === 'project:update') {
    const project = await getProjectById(String(args.id ?? ''), String(args.orgId ?? ''))
    if (project) return project as T
  }
  return result
}

const raw = {
  action: <T>(name: string, args: Record<string, unknown>) => expectError<T>(() => runMutation<T>(name, args)),
  mutation: <T>(name: string, args: Record<string, unknown>) => expectError<T>(() => runMutation<T>(name, args)),
  query: <T>(name: string, args: Record<string, unknown>) => expectError<T>(() => runQuery<T>(name, args))
}

const tc = {
  action: async <T>(f: unknown, args: Record<string, unknown>): Promise<T> => runMutation<T>(getFunctionName(f), args),
  mutation: async <T>(f: unknown, args: Record<string, unknown>): Promise<T> => runMutation<T>(getFunctionName(f), args),
  query: async <T>(f: unknown, args: Record<string, unknown>): Promise<T> => runQuery<T>(getFunctionName(f), args),
  raw
}

const ensureTestUser = async () => {
  await getTokenFor('default')
}

const getTestToken = async () => (await getTokenFor('default')).token

const tryCleanup = async (name: string, args: Record<string, unknown>) => {
  try {
    await raw.mutation(name, args)
  } catch (error) {
    const parsed = extractErrorCode(error)
    if (!(parsed && parsed.code === 'NOT_IMPLEMENTED')) throw error
  }
}

const makeOrgTestUtils = (prefix: string) => ({
  cleanupOrgTestData: async () => {
    const orgs = await querySQL<Record<string, unknown>>('SELECT * FROM org')
    for (const org of orgs) {
      const slug = String(org.slug ?? '')
      if (slug.startsWith(`${prefix}-`)) await expectError(async () => callReducer('org_remove', { orgId: toInt(org.id) }))
    }
    await tryCleanup('testauth:cleanupOrgTestData', { slugPrefix: prefix })
  },
  cleanupTestUsers: async () => {
    await tryCleanup('testauth:cleanupTestUsers', { emailPrefix: `${prefix}-` })
  },
  generateSlug: (suffix: string) => `${prefix}-${suffix}-${Date.now()}`
})

const setupOrg = (testPrefix: string, orgName: string, orgSlugSuffix: string) => {
  const utils = makeOrgTestUtils(testPrefix)
  let orgId = ''
  let orgSlug = ''

  return {
    ...utils,
    afterAll: async () => {
      await utils.cleanupOrgTestData()
      await utils.cleanupTestUsers()
    },
    beforeAll: async () => {
      await ensureTestUser()
      orgSlug = utils.generateSlug(orgSlugSuffix)
      const { orgId: newOrgId } = await createTestOrg(orgSlug, orgName)
      orgId = newOrgId
      return { orgId, orgSlug }
    },
    get orgId() {
      return orgId
    },
    get orgSlug() {
      return orgSlug
    }
  }
}

export {
  addTestOrgMember,
  api,
  createTestOrg,
  createTestUser,
  ensureTestUser,
  expectError,
  extractErrorCode,
  getClient,
  getTestToken,
  makeOrgTestUtils,
  querySQL,
  removeTestOrgMember,
  setupOrg,
  tc
}
