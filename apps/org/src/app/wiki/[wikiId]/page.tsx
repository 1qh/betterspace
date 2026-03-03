/* oxlint-disable promise/prefer-await-to-then */
'use client'

import type { OrgProfile, Wiki } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail, sameIdentity } from '@a/fe/utils'
import { Badge } from '@a/ui/badge'
import { Button } from '@a/ui/button'
import { Skeleton } from '@a/ui/skeleton'
import { EditorsSection } from 'betterspace/components'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { toast } from 'sonner'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'

/** biome-ignore lint/suspicious/noEmptyBlockStatements: noop */
const noop: () => void = (): void => {}, // eslint-disable-line @typescript-eslint/no-empty-function
  WikiDetailPage = ({ params }: { params: Promise<{ wikiId: string }> }) => {
    const { wikiId } = use(params),
      id = Number(wikiId),
      { isAdmin, org } = useOrg(),
      { identity } = useSpacetimeDB(),
      [allWikis] = useTable(tables.wiki),
      [allProfiles] = useTable(tables.orgProfile),
      wiki = allWikis.find((w: Wiki) => w.id === id && w.orgId === Number(org._id)),
      updateWiki = useReducer(reducers.updateWiki),
      profileByUserId = new Map<string, OrgProfile>(),
      restoreMut = async (args: { id: number }) => {
        if (!wiki) return
        await updateWiki({
          content: wiki.content,
          deletedAt: undefined,
          editors: wiki.editors,
          expectedUpdatedAt: wiki.updatedAt,
          id: args.id,
          slug: wiki.slug,
          status: wiki.status,
          title: wiki.title
        })
      }

    for (const p of allProfiles) profileByUserId.set(p.userId.toHexString(), p)

    if (!(wiki && identity)) return <Skeleton className='h-40' />

    const isDeleted = wiki.deletedAt !== undefined,
      editorsList = (wiki.editors ?? []).map(e => {
        const userId = e.toHexString(),
          profile = profileByUserId.get(userId)
        return { email: '', name: profile?.displayName ?? userId.slice(0, 8), userId }
      }),
      canEditWiki =
        isAdmin || sameIdentity(wiki.userId, identity) || editorsList.some(e => e.userId === identity.toHexString()),
      handleRestore = () => {
        restoreMut({ id: wiki.id })
          .then(() => toast.success('Wiki restored'))
          .catch(fail)
      }

    return (
      <div className='space-y-6'>
        {isDeleted ? (
          <div
            className='flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3'
            data-testid='deleted-banner'>
            <div className='flex items-center gap-2 text-destructive'>
              <Trash2 className='size-4' />
              <span className='text-sm font-medium'>This wiki page has been deleted</span>
            </div>
            <Button data-testid='restore-wiki-detail' onClick={handleRestore} size='sm' variant='outline'>
              <RotateCcw className='mr-1.5 size-3.5' />
              Restore
            </Button>
          </div>
        ) : null}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <h1 className={`text-2xl font-bold ${isDeleted ? 'line-through opacity-60' : ''}`}>{wiki.title}</h1>
            {isDeleted ? (
              <Badge variant='destructive'>deleted</Badge>
            ) : canEditWiki ? null : (
              <Badge variant='secondary'>View only</Badge>
            )}
          </div>
          {canEditWiki && !isDeleted ? (
            <Button asChild variant='outline'>
              <Link href={`/wiki/${wikiId}/edit`}>
                <Pencil className='mr-2 size-4' />
                Edit
              </Link>
            </Button>
          ) : null}
        </div>
        <div className='flex items-center gap-2'>
          <span className='text-sm text-muted-foreground'>{wiki.slug}</span>
          <Badge variant={wiki.status === 'published' ? 'default' : 'secondary'}>{wiki.status}</Badge>
        </div>
        {wiki.content ? <p className='text-muted-foreground'>{wiki.content}</p> : null}

        {isAdmin && !isDeleted ? (
          <EditorsSection editorsList={editorsList} members={[]} onAdd={noop} onRemove={noop} />
        ) : null}
      </div>
    )
  }

export default WikiDetailPage
