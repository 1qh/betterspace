'use client'

import type { Chat } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { toIdentityKey } from '@a/fe/utils'
import { Spinner } from '@a/ui/spinner'
import { useMutate } from 'betterspace/react'
import { Check } from 'lucide-react'
import { toast } from 'sonner'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import ChatSidebar from './chat-sidebar'

const Sb = () => {
  const { identity } = useSpacetimeDB(),
    [allChats, isReady] = useTable(tables.chat),
    deleteChatRaw = useReducer(reducers.rmChat),
    deleteChat = useMutate(deleteChatRaw, {
      getName: args => `chat.rm:${args.id}`,
      onSettled: (_args, error) => {
        if (error) toast.error('Failed to delete conversation')
      },
      onSuccess: () => {
        toast.success('Conversation deleted')
      }
    }),
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
