'use client'

import { reducers, tables } from '@a/be/spacetimedb'
import { Conversation, ConversationContent, ConversationEmptyState } from '@a/ui/ai-elements/conversation'
import { PromptInput, PromptInputFooter, PromptInputSubmit, PromptInputTextarea } from '@a/ui/ai-elements/prompt-input'
import { Label } from '@a/ui/label'
import { Switch } from '@a/ui/switch'
import { SparklesIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'
import { useEffect, useRef, useState, useTransition } from 'react'

const toIdentityKey = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('toHexString' in value)) return String(value)
    const candidate = value as { toHexString?: () => string }
    if (typeof candidate.toHexString === 'function') return candidate.toHexString()
    return String(value)
  },
  Page = () => {
    const router = useRouter(),
      createChat = useReducer(reducers.createChat),
      { identity } = useSpacetimeDB(),
      [allChats] = useTable(tables.chat),
      pendingTitle = useRef<string | null>(null),
      [isSubmitting, setIsSubmitting] = useState(false),
      [isPublic, setIsPublic] = useState(false),
      [isPending, startTransition] = useTransition(),
      identityKey = toIdentityKey(identity)

    useEffect(() => {
      if (!pendingTitle.current) return
      const title = pendingTitle.current
      const chat = allChats.find(c => c.title === title && toIdentityKey(c.userId) === identityKey)
      if (chat) {
        pendingTitle.current = null
        const query = encodeURIComponent(title)
        startTransition(() => router.push(`/${chat.id}?query=${query}`))
      }
    }, [allChats, identityKey, router, startTransition])

    const handleSubmit = async ({ text }: { text: string }) => {
      if (!text.trim() || isSubmitting) return
      setIsSubmitting(true)
      pendingTitle.current = text
      try {
        await createChat({ isPublic, title: text })
      } catch {
        pendingTitle.current = null
      } finally {
        setIsSubmitting(false)
      }
    }
    return (
      <div className='flex flex-1 flex-col overflow-hidden'>
        <Conversation>
          <ConversationContent className='mx-auto flex max-w-3xl flex-col items-center justify-center'>
            <ConversationEmptyState
              data-testid='empty-state'
              description='Ask me about the weather anywhere in the world'
              icon={<SparklesIcon className='size-8' />}
              title='How can I help you today?'
            />
          </ConversationContent>
        </Conversation>
        <div className='mx-auto flex w-full max-w-3xl flex-col gap-2'>
          <div className='flex items-center gap-2 px-1'>
            <Switch checked={isPublic} data-testid='public-toggle' id='public-toggle' onCheckedChange={setIsPublic} />
            <Label htmlFor='public-toggle'>{isPublic ? 'Public' : 'Private'}</Label>
          </div>
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              data-testid='chat-input'
              disabled={isSubmitting || isPending}
              placeholder='Send a message...'
            />
            <PromptInputFooter>
              <div />
              <PromptInputSubmit
                data-testid={isSubmitting || isPending ? 'stop-button' : 'send-button'}
                status={isSubmitting || isPending ? 'submitted' : 'ready'}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    )
  }

export default Page
