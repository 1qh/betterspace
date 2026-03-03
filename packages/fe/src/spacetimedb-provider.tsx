'use client'

import type { ReactNode } from 'react'
import type { DbConnectionConfig } from 'spacetimedb'

import { FileApiProvider } from 'betterspace/components'
import { NavigationGuardProvider } from 'next-navigation-guard'
import { AuthProvider as OidcProvider } from 'react-oidc-context'
import { DbConnectionBuilder, DbConnectionImpl } from 'spacetimedb'
import { SpacetimeDBProvider as BaseProvider } from 'spacetimedb/react'

import env from './env'

interface SpacetimeDBProviderProps {
  children: ReactNode
  convexUrl?: string
  fileApi?: boolean
  noAuth?: boolean
  spacetimeUri?: string
}

const REMOTE_MODULE = {
    procedures: [],
    reducers: [],
    tables: {},
    versionInfo: { cliVersion: '2.0.0' }
  } as const,
  TOKEN_KEY = 'spacetimedb.token',
  clients = new Map<string, DbConnectionBuilder<DbConnectionImpl<typeof REMOTE_MODULE>>>(),
  getToken = () => {
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem(TOKEN_KEY)
    return token || undefined
  },
  storeToken = (token: string) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(TOKEN_KEY, token)
    document.cookie = `spacetimedb_token=${encodeURIComponent(token)}; Path=/; SameSite=Lax`
  },
  toWsUri = (uri: string) => {
    if (uri.startsWith('https://')) return uri.replace('https://', 'wss://')
    if (uri.startsWith('http://')) return uri.replace('http://', 'ws://')
    return uri
  },
  getClient = (uri: string, moduleName: string) => {
    const key = `${uri}::${moduleName}`,
      existing = clients.get(key)
    if (existing) return existing
    const builder = new DbConnectionBuilder(
      REMOTE_MODULE,
      (config: DbConnectionConfig<typeof REMOTE_MODULE>) => new DbConnectionImpl(config)
    )
      .withUri(toWsUri(uri))
      .withDatabaseName(moduleName)
      .withLightMode(true)
      .withToken(getToken())
      .onConnect((_conn, _identity, token) => {
        storeToken(token)
      })
    clients.set(key, builder)
    return builder
  },
  SpacetimeProvider = ({ children, convexUrl, fileApi, noAuth, spacetimeUri }: SpacetimeDBProviderProps) => {
    const moduleName = env.SPACETIMEDB_MODULE_NAME,
      uri = spacetimeUri ?? convexUrl ?? env.NEXT_PUBLIC_SPACETIMEDB_URI,
      builder = getClient(uri, moduleName),
      guarded = <NavigationGuardProvider>{children}</NavigationGuardProvider>,
      inner = fileApi ? <FileApiProvider value={{}}>{guarded}</FileApiProvider> : guarded,
      authInner = noAuth ? (
        inner
      ) : (
        <OidcProvider
          authority='https://auth.spacetimedb.com/oidc'
          client_id={env.NEXT_PUBLIC_SPACETIMEDB_OIDC_CLIENT_ID}
          post_logout_redirect_uri='/'
          redirect_uri='/login'
          scope='openid profile email'>
          {inner}
        </OidcProvider>
      )
    return <BaseProvider connectionBuilder={builder}>{authInner}</BaseProvider>
  }

export default SpacetimeProvider
