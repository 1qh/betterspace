/* oxlint-disable promise/prefer-await-to-then */
'use client'

import type { Wiki } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail } from '@a/fe/utils'
import { Badge } from '@a/ui/badge'
import { Button } from '@a/ui/button'
import { Skeleton } from '@a/ui/skeleton'
import { EditorsSection } from 'betterspace/components'
import { Pencil, RotateCcw, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'
import { toast } from 'sonner'

import { useOrg } from '~/hook/use-org'

const sameIdentity = (a: { toHexString: () => string }, b: { toHexString: () => string }) =>
    a.toHexString() === b.toHexString(),
  noop = () => undefined,
  WikiDetailPage = ({ params }: { params: Promise<{ wikiId: string }> }) => {
    const { wikiId } = use(params),
      id = Number(wikiId),
      { isAdmin, org } = useOrg(),
      { identity } = useSpacetimeDB(),
      [allWikis] = useTable(tables.wiki),
      wiki = allWikis.find((w: Wiki) => w.id === id && w.orgId === Number(org._id)),
      updateWiki = useReducer(reducers.updateWiki),
      restoreMut = async (args: { id: number }) => updateWiki({ deletedAt: null, id: args.id })

    if (!(wiki && identity)) return <Skeleton className='h-40' />

    const isDeleted = wiki.deletedAt !== undefined && wiki.deletedAt !== null,
      editorsList = (wiki.editors ?? []).map(e => ({ userId: e.toHexString() })),
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
