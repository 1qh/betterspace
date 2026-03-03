'use client'

import type { UploadOptions, UploadResponse } from 'betterspace/components'
import type { ReactNode } from 'react'

import { DbConnection } from '@a/be/spacetimedb'
import { FileApiProvider } from 'betterspace/components'
import { NavigationGuardProvider } from 'next-navigation-guard'
import { AuthProvider as OidcProvider } from 'react-oidc-context'
import { SpacetimeDBProvider as BaseProvider } from 'spacetimedb/react'

import env from './env'

interface SpacetimeDBProviderProps {
  children: ReactNode
  fileApi?: boolean
  noAuth?: boolean
  spacetimeUri?: string
}

const TOKEN_KEY = 'spacetimedb.token',
  PRESIGN_ENDPOINT = '/api/upload/presign',
  HTTP_OK = 200,
  HTTP_REDIRECT = 300,
  OCTET_STREAM = 'application/octet-stream',
  uploadFile = async (file: File, options?: UploadOptions): Promise<UploadResponse> => {
    const contentType = file.type || OCTET_STREAM,
      presignRes = await fetch(PRESIGN_ENDPOINT, {
        body: JSON.stringify({ contentType, filename: file.name, size: file.size }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
        signal: options?.signal
      })
    if (!presignRes.ok) throw new Error('Failed to get presigned URL')
    const presigned = (await presignRes.json()) as {
      headers?: Record<string, string>
      method?: string
      storageKey: string
      uploadUrl: string
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open(presigned.method ?? 'PUT', presigned.uploadUrl)
      const headers = presigned.headers ?? {}
      let hasContentType = false
      for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === 'content-type') hasContentType = true
        const val = headers[key]
        if (val) xhr.setRequestHeader(key, val)
      }
      if (!hasContentType) xhr.setRequestHeader('Content-Type', contentType)
      if (options?.onProgress)
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable && options.onProgress) options.onProgress(Math.round((e.loaded / e.total) * 100))
        })
      xhr.addEventListener('load', () => {
        if (xhr.status >= HTTP_OK && xhr.status < HTTP_REDIRECT)
          resolve({ storageId: presigned.storageKey, url: `${presigned.uploadUrl.split('?')[0]}` })
        else reject(new Error(`Upload failed: ${xhr.status}`))
      })
      xhr.addEventListener('error', () => reject(new Error('Upload network error')))
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))
      if (options?.signal) {
        if (options.signal.aborted) {
          xhr.abort()
          reject(new Error('Upload aborted'))
          return
        }
        options.signal.addEventListener('abort', () => xhr.abort(), { once: true })
      }
      xhr.send(file)
    })
  },
  FILE_API = { upload: uploadFile },
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
  SpacetimeProvider = ({ children, fileApi, noAuth, spacetimeUri }: SpacetimeDBProviderProps) => {
    const moduleName = env.SPACETIMEDB_MODULE_NAME,
      uri = spacetimeUri ?? env.NEXT_PUBLIC_SPACETIMEDB_URI,
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
