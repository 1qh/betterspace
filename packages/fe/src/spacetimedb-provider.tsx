'use client'

import type { ReactNode } from 'react'

import { DbConnection } from '@a/be/spacetimedb'
import { FileApiProvider } from 'betterspace/components'
import { NavigationGuardProvider } from 'next-navigation-guard'
import { AuthProvider as OidcProvider } from 'react-oidc-context'
import { SpacetimeDBProvider as BaseProvider } from 'spacetimedb/react'

import env from './env'

interface SpacetimeDBProviderProps {
  children: ReactNode
  convexUrl?: string
  fileApi?: boolean
  noAuth?: boolean
  spacetimeUri?: string
}

const TOKEN_KEY = 'spacetimedb.token',
  FILE_API = { info: '/api/file/info', upload: '/api/file/upload' },
  clients = new Map<string, ReturnType<typeof DbConnection.builder>>(),
  getToken = () => {
    if (typeof window === 'undefined') return
    const token = window.localStorage.getItem(TOKEN_KEY)
    return token ?? undefined
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
    const builder = DbConnection.builder()
      .withUri(toWsUri(uri))
      .withDatabaseName(moduleName)
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
      inner = fileApi ? <FileApiProvider value={FILE_API}>{guarded}</FileApiProvider> : guarded,
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
