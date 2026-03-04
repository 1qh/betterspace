'use client'

import { tables } from '@a/be/spacetimedb'
import { useList } from 'betterspace/react'
import Link from 'next/link'
import { useTable } from 'spacetimedb/react'

const Page = () => {
  const [allChats, isReady] = useTable(tables.chat),
    { data: chats } = useList(allChats, isReady, {
      sort: { direction: 'desc', field: 'updatedAt' },
      where: { isPublic: true }
    })
  return (
    <div className='mx-auto max-w-3xl p-4' data-testid='public-chats-page'>
      <h1 className='mb-4 text-xl font-semibold'>Public Chats</h1>
      {chats.length === 0 ? (
        <p className='text-muted-foreground'>No public chats yet</p>
      ) : (
        <div className='divide-y'>
          {chats.map(c => (
            <Link className='block py-3 hover:bg-muted/50' data-testid='public-chat-item' href={`/${c.id}`} key={c.id}>
              <p className='font-medium'>{c.title}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default Page
