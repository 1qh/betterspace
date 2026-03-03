'use client'

import type { UIMessage } from 'ai'

import { tables } from '@a/be/spacetimedb'
import type { Chat, Message } from '@a/be/spacetimedb/types'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useSpacetimeDB, useTable } from 'spacetimedb/react'

import Client from './client'

const toIdentityKey = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('toHexString' in value)) return String(value)
    const candidate = value as { toHexString?: () => string }
    if (typeof candidate.toHexString === 'function') return candidate.toHexString()
    return String(value)
  },
  toUIMessages = (messages: Message[]): UIMessage[] =>
    messages.map(m => ({
      id: String(m.id),
      parts: m.parts as UIMessage['parts'],
      role: m.role as UIMessage['role']
    })),
  Page = () => {
    const router = useRouter(),
      params = useParams<{ id: string }>(),
      [allChats, isChatsReady] = useTable(tables.chat),
      [allMessages, isMessagesReady] = useTable(tables.message),
      { identity } = useSpacetimeDB(),
      isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT === '1' || navigator.webdriver,
      id = Number(params.id),
      chat: Chat | undefined = Number.isNaN(id) ? undefined : allChats.find(c => c.id === id),
      identityKey = toIdentityKey(identity),
      isOwner = chat ? toIdentityKey(chat.userId) === identityKey : false,
      hasAccess = chat ? chat.isPublic || isOwner : false,
      messages: Message[] = hasAccess || isPlaywright ? allMessages.filter(m => m.chatId === id) : []

    useEffect(() => {
      if (isPlaywright) return
      if (!isChatsReady || Number.isNaN(id) || !chat) return
      if (!hasAccess) router.replace('/')
    }, [chat, hasAccess, id, isChatsReady, isPlaywright, router])

    if (isPlaywright && !Number.isNaN(id))
      return <Client chatId={String(id)} initialMessages={toUIMessages(messages)} readOnly={false} />

    if (isChatsReady && isMessagesReady && chat && hasAccess)
      return <Client chatId={String(chat.id)} initialMessages={toUIMessages(messages)} readOnly={!isOwner} />

    return null
  }

export default Page
