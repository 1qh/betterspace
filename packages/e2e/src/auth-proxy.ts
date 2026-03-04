// biome-ignore-all lint/suspicious/noEmptyBlockStatements: intentional swallow
// biome-ignore-all lint/style/noProcessEnv: e2e env
// oxlint-disable no-empty-function
import { serve } from 'bun'

interface IdentityResponse {
  token: string
}

interface ProxySocketData {
  queue?: (ArrayBuffer | Buffer | string)[]
  ready?: boolean
  upstream?: WebSocket
  url: string
}

const BACKEND_API = 'http://127.0.0.1:3212',
  BACKEND_WS = 'ws://127.0.0.1:3212',
  IDENTITY_URL = `${process.env.NEXT_PUBLIC_SPACETIMEDB_HOST ?? 'http://localhost:3000'}/v1/identity`,
  SITE_URL = 'http://127.0.0.1:3211'

let cachedToken: null | string = null

const getToken = async (): Promise<string> => {
  if (cachedToken) return cachedToken
  const response = await fetch(IDENTITY_URL, { method: 'POST' })
  if (!response.ok) throw new Error('Failed to mint SpacetimeDB identity token')
  const payload = (await response.json()) as IdentityResponse
  cachedToken = payload.token
  return cachedToken
}

process.on('uncaughtException', () => {})
process.on('unhandledRejection', () => {})

serve({
  port: 3210,
  async fetch(req, server) {
    try {
      const url = new URL(req.url)

      if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
        if (server.upgrade(req, { data: { url: `${BACKEND_WS}${url.pathname}${url.search}` } })) return
        return new Response('WebSocket upgrade failed', { status: 500 })
      }

      const target = url.pathname.startsWith('/api/auth') ? SITE_URL : BACKEND_API,
        targetUrl = `${target}${url.pathname}${url.search}`,
        headers = new Headers(req.headers)

      headers.delete('host')
      headers.set('x-spacetimedb-test-mode', process.env.SPACETIMEDB_TEST_MODE ?? 'true')

      const isAuthPath = url.pathname.startsWith('/api/auth'),
        hasAuthorization = headers.has('authorization')

      if (!(isAuthPath || hasAuthorization)) headers.set('authorization', `Bearer ${await getToken()}`)

      const response = await fetch(targetUrl, {
        body: req.body,
        headers,
        method: req.method,
        redirect: 'manual'
      })

      return new Response(response.body, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
      })
    } catch {
      return new Response('Proxy error', { status: 502 })
    }
  },
  websocket: {
    close(ws) {
      const data = ws.data as ProxySocketData
      data.upstream?.close()
    },
    message(ws, message) {
      const data = ws.data as ProxySocketData
      if (data.ready && data.upstream) {
        data.upstream.send(message)
        return
      }
      data.queue = data.queue ?? []
      data.queue.push(message)
    },
    open(ws) {
      const data = ws.data as ProxySocketData,
        upstream = new WebSocket(data.url)

      data.upstream = upstream
      upstream.addEventListener('open', () => {
        data.ready = true
        const { queue } = data
        if (!queue) return
        for (const msg of queue) upstream.send(msg)
        data.queue = undefined
      })
      upstream.addEventListener('message', event => ws.send(event.data as string))
      upstream.addEventListener('close', () => ws.close())
      upstream.addEventListener('error', () => ws.close())
    }
  }
})
