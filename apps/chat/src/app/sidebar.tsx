'use client'

import type { Chat } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { Spinner } from '@a/ui/spinner'
import { Check } from 'lucide-react'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import ChatSidebar from './chat-sidebar'

const toIdentityKey = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return `${value}`
    if (typeof value !== 'object' || !('toHexString' in value)) return ''
    const candidate = value as { toHexString?: () => string }
    if (typeof candidate.toHexString === 'function') return candidate.toHexString()
    return ''
  },
  Sb = () => {
    const { identity } = useSpacetimeDB(),
      [allChats, isReady] = useTable(tables.chat),
      deleteChat = useReducer(reducers.rmChat),
      identityKey = toIdentityKey(identity),
      chats: Chat[] = allChats
        .filter(c => toIdentityKey(c.userId) === identityKey)
        .toSorted((a, b) => (a.updatedAt > b.updatedAt ? -1 : a.updatedAt < b.updatedAt ? 1 : 0)),
      handleDelete = async (chatId: number) => {
        await deleteChat({ id: chatId })
      }

    return (
      <>
        <ChatSidebar basePath='' onDelete={handleDelete} threads={chats} />
        <div className='flex justify-center p-2'>
          {isReady ? (
            chats.length > 20 ? (
              <Check className='animate-[fadeOut_2s_forwards] text-green-500' />
            ) : null
          ) : (
            <Spinner />
          )}
        </div>
      </>
    )
  }

export default Sb
