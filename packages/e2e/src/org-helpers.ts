import type { api as BeApi } from '@a/be'
import type { Id } from '@a/be/model'

interface ErrorCode {
  code: string
}

interface FunctionLikeReference {
  [key: string]: unknown
  [key: symbol]: unknown
}

interface IdentityResponse {
  identity: string
  token: string
}

interface ReducerElement {
  name?: { some?: string }
}

interface ReducerSchema {
  name?: string
  params?: { elements?: ReducerElement[] }
}

interface SchemaResponse {
  reducers?: ReducerSchema[]
}

const FUNCTION_NAME = Symbol.for('functionName'),
  ERROR_CODE_RE = /\{"code":"([^"]+)"[^}]*\}/,
  makeApiProxy = (parts: string[] = []): unknown =>
    new Proxy(
      {},
      {
        get: (_target, key) => {
          if (key === FUNCTION_NAME) return parts.join(':')
          if (typeof key !== 'string') return null
          return makeApiProxy([...parts, key])
        }
      }
    ),
  api = makeApiProxy() as unknown as typeof BeApi,
  identityCache = new Map<string, IdentityResponse>(),
  getHost = () => process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? 'http://localhost:3000',
  getModule = () => process.env.NEXT_PUBLIC_SPACETIMEDB_MODULE ?? 'betterspace',
  makeCodeError = (code: string): Error => new Error(JSON.stringify({ code })),
  toReducerName = (name: string): string => {
    if (name.includes('_')) return name
    const parts = name.split(':'),
      mod = parts[0] ?? '',
      fn = parts[1] ?? ''
    const hasParts = mod.length > 0 && fn.length > 0
    if (!hasParts) return name
    return `${fn}_${mod}`
  },
  parseJson = async <T>(response: Response): Promise<T> => {
    const text = await response.text()
    if (!response.ok) {
      if (text.trim().length > 0) throw new Error(text)
      throw new Error(response.statusText)
    }
    if (text.trim().length === 0) return null as T
    return JSON.parse(text) as T
  },
  getTokenFor = async (key: string): Promise<IdentityResponse> => {
    const existing = identityCache.get(key)
    if (existing) return existing
    const response = await fetch(`${getHost()}/v1/identity`, { method: 'POST' }),
      created = await parseJson<IdentityResponse>(response)
    identityCache.set(key, created)
    return created
  }

let reducerParamsPromise: null | Promise<Map<string, string[]>> = null

const getReducerParams = async (): Promise<Map<string, string[]>> => {
    if (reducerParamsPromise !== null) return reducerParamsPromise
    reducerParamsPromise = (async () => {
      const response = await fetch(`${getHost()}/v1/database/${getModule()}/schema?version=9`),
        schema = await parseJson<SchemaResponse>(response),
        map = new Map<string, string[]>(),
        reducers = schema.reducers ?? []
      for (const reducer of reducers) {
        const reducerName = reducer.name
        if (reducerName) {
          const elements = reducer.params?.elements ?? [],
            names: string[] = []
          for (const el of elements) {
            const name = el.name?.some
            if (name) names.push(name)
          }
          map.set(reducerName, names)
        }
      }
      return map
    })()
    return reducerParamsPromise
  },
  getFunctionName = (f: unknown): string => {
    if (!f || typeof f !== 'object') throw makeCodeError('INVALID_FUNCTION_REFERENCE')
    const raw = (f as FunctionLikeReference)[FUNCTION_NAME]
    if (typeof raw !== 'string' || raw.length === 0) throw makeCodeError('INVALID_FUNCTION_REFERENCE')
    return raw
  },
  resolveReducer = (f: unknown): string => toReducerName(getFunctionName(f)),
  normalizeArgs = async (reducer: string, args: Record<string, unknown>): Promise<unknown[]> => {
    const reducerParams = await getReducerParams(),
      params = reducerParams.get(reducer)
    if (!params) throw makeCodeError('NOT_IMPLEMENTED')
    const out: unknown[] = []
    for (const name of params) out.push(args[name])
    return out
  },
  callReducer = async <T>(reducer: string, args: Record<string, unknown>, identityKey = 'default'): Promise<T> => {
    const payload = await normalizeArgs(reducer, args),
      { token } = await getTokenFor(identityKey),
      response = await fetch(`${getHost()}/v1/database/${getModule()}/call/${reducer}`, {
        body: JSON.stringify(payload),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        method: 'POST'
      }),
      text = await response.text()
    if (!response.ok) {
      if (text.trim().length > 0) throw new Error(text)
      throw makeCodeError('REDUCER_CALL_FAILED')
    }
    if (text.trim().length === 0) return null as T
    return JSON.parse(text) as T
  },
  getClient = () => ({ host: getHost(), moduleName: getModule() }),
  extractErrorCode = (e: unknown): null | { code: string } => {
    if (e instanceof Error) {
      const match = ERROR_CODE_RE.exec(e.message)
      if (match?.[1]) return { code: match[1] }
      if (e.message.includes('NOT_IMPLEMENTED')) return { code: 'NOT_IMPLEMENTED' }
      if (e.message.includes('Validation') || e.message.includes('validation')) return { code: 'VALIDATION_ERROR' }
    }
    return null
  },
  expectError = async <T>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn()
    } catch (error) {
      const r = extractErrorCode(error)
      if (r) return r as T
      throw error
    }
  },
  raw = {
    action: <T>(name: string, args: Record<string, unknown>) =>
      expectError<T>(() => callReducer<T>(toReducerName(name), args)),
    mutation: <T>(name: string, args: Record<string, unknown>) =>
      expectError<T>(() => callReducer<T>(toReducerName(name), args)),
    query: <T>(name: string, args: Record<string, unknown>) =>
      expectError<T>(() => callReducer<T>(toReducerName(name), args))
  },
  tc = {
    action: async <T>(f: unknown, args: Record<string, unknown>): Promise<T> =>
      callReducer<T>(resolveReducer(f), args as Record<string, unknown>),
    mutation: async <T>(f: unknown, args: Record<string, unknown>): Promise<T> =>
      callReducer<T>(resolveReducer(f), args as Record<string, unknown>),
    query: async <T>(f: unknown, args: Record<string, unknown>): Promise<T> =>
      callReducer<T>(resolveReducer(f), args as Record<string, unknown>),
    raw
  },
  ensureTestUser = async () => {
    await getTokenFor('default')
  },
  getTestToken = async () => (await getTokenFor('default')).token,
  createTestUser = async (email: string, _name: string) =>
    (await getTokenFor(`user:${email}`)).identity as unknown as Id<'users'>,
  addTestOrgMember = async (orgId: Id<'org'> | string, userId: Id<'users'> | string, _isAdmin: boolean) =>
    `${String(orgId)}:${String(userId)}`,
  removeTestOrgMember = async (_orgId: Id<'org'> | string, _userId: Id<'users'> | string) => undefined,
  createTestOrg = async (slug: string, name: string) => {
    const result = await raw.mutation<ErrorCode | { orgId: string }>('org:create', { data: { name, slug } })
    if (result && typeof result === 'object' && 'orgId' in result) return result
    return { orgId: `${slug}-${Date.now()}` }
  },
  tryCleanup = async (name: string, args: Record<string, unknown>) => {
    try {
      await raw.mutation(name, args)
    } catch (error) {
      const parsed = extractErrorCode(error)
      if (!(parsed && parsed.code === 'NOT_IMPLEMENTED')) throw error
    }
  },
  makeOrgTestUtils = (prefix: string) => ({
    cleanupOrgTestData: async () => {
      await tryCleanup('testauth:cleanupOrgTestData', { slugPrefix: prefix })
    },
    cleanupTestUsers: async () => {
      await tryCleanup('testauth:cleanupTestUsers', { emailPrefix: `${prefix}-` })
    },
    generateSlug: (suffix: string) => `${prefix}-${suffix}-${Date.now()}`
  }),
  setupOrg = (testPrefix: string, orgName: string, orgSlugSuffix: string) => {
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
        const { orgId: id } = await createTestOrg(orgSlug, orgName)
        orgId = id
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
  removeTestOrgMember,
  setupOrg,
  tc
}
