/* oxlint-disable promise/prefer-await-to-then */
// biome-ignore-all lint/nursery/noFloatingPromises: event handler

'use client'

import type { Wiki } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail } from '@a/fe/utils'
import { Badge } from '@a/ui/badge'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { Checkbox } from '@a/ui/checkbox'
import { Input } from '@a/ui/input'
import { useBulkSelection, useSearch } from 'betterspace/react'
import { FileText, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { useReducer, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'

const WikiPage = () => {
  const { isAdmin, org } = useOrg(),
    [showDeleted, setShowDeleted] = useState(false),
    [query, setQuery] = useState(''),
    [allWikis, isWikisReady] = useTable(tables.wiki),
    orgWikis = allWikis

      .filter((w: Wiki) => w.orgId === Number(org._id) && w.deletedAt === undefined)
      // oxlint-disable-next-line oxc/no-map-spread
      .map((w: Wiki) => ({ ...w, _id: `${w.id}` })),
    { results: wikis } = useSearch(orgWikis, isWikisReady, {
      fields: ['title', 'slug'],
      query
    }),
    deletedWikis = allWikis

      .filter((w: Wiki) => w.orgId === Number(org._id) && w.deletedAt !== undefined)
      // oxlint-disable-next-line oxc/no-map-spread
      .map((w: Wiki) => ({ ...w, _id: `${w.id}` })),
    updateWiki = useReducer(reducers.updateWiki),
    restoreMut = async (args: { id: string }) => {
      const wiki = allWikis.find(w => w.id === Number(args.id))
      if (!wiki) return
      await updateWiki({
        content: wiki.content,
        deletedAt: undefined,
        editors: wiki.editors,
        expectedUpdatedAt: wiki.updatedAt,
        id: wiki.id,
        slug: wiki.slug,
        status: wiki.status,
        title: wiki.title
      })
    },
    rmWiki = useReducer(reducers.rmWiki),
    bulkRm = async ({ ids }: { ids: string[]; orgId: string }) => {
      const tasks: Promise<void>[] = []
      for (const id of ids) tasks.push(rmWiki({ id: Number(id) }))
      await Promise.all(tasks)
    },
    { clear, handleBulkDelete, selected, toggleSelect, toggleSelectAll } = useBulkSelection({
      bulkRm,
      items: wikis,
      onError: (e: unknown) => {
        fail(e)
      },
      orgId: org._id,
      restore: restoreMut,
      toast: (msg, opts) => {
        toast(msg, opts)
      },
      undoLabel: 'wiki page'
    }),
    activeItems = showDeleted ? [] : wikis,
    deletedItems = deletedWikis,
    visibleCount = showDeleted ? deletedItems.length : activeItems.length

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <h1 className='font-bold text-2xl'>
            Wiki <span className='font-normal text-base text-muted-foreground'>({visibleCount})</span>
          </h1>
          {isAdmin && !showDeleted && selected.size > 0 ? (
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-sm'>{selected.size} selected</span>
              <Button
                onClick={() => {
                  handleBulkDelete().catch(fail)
                }}
                size='sm'
                variant='destructive'>
                Delete
              </Button>
              <Button onClick={clear} size='sm' variant='ghost'>
                Clear
              </Button>
            </div>
          ) : null}
        </div>
        <div className='flex items-center gap-2'>
          <Button
            className={showDeleted ? 'border-destructive/50 text-destructive' : ''}
            data-testid='trash-toggle'
            onClick={() => {
              setShowDeleted(v => !v)
              clear()
            }}
            size='sm'
            variant='outline'>
            <Trash2 className='mr-1.5 size-3.5' />
            Trash
          </Button>
          {showDeleted ? null : (
            <Button asChild>
              <Link href='/wiki/new'>
                <Plus className='mr-2 size-4' />
                New wiki
              </Link>
            </Button>
          )}
        </div>
      </div>

      {showDeleted ? null : (
        <div className='relative'>
          <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            className='pl-9'
            data-testid='wiki-search-input'
            onChange={e => setQuery(e.target.value)}
            placeholder='Search wiki pages...'
            type='search'
            value={query}
          />
        </div>
      )}

      {showDeleted ? (
        deletedItems.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center gap-2 py-8 text-center'>
              <Trash2 className='size-12 text-muted-foreground/50' />
              <p className='text-muted-foreground'>No deleted wiki pages</p>
            </CardContent>
          </Card>
        ) : (
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {deletedItems.map(w => (
              <Card className='border-dashed opacity-60' data-testid='deleted-wiki-item' key={w._id}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <CardTitle className='line-through'>{w.title}</CardTitle>
                    <Badge variant='destructive'>deleted</Badge>
                  </div>
                </CardHeader>
                <CardContent className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-sm'>{w.slug}</span>
                  <Button
                    data-testid='restore-wiki'
                    onClick={() => {
                      const run = async () => {
                        try {
                          await restoreMut({ id: w._id })
                        } catch (restoreError: unknown) {
                          fail(restoreError)
                        }
                      }
                      run()
                    }}
                    size='sm'
                    variant='outline'>
                    <RotateCcw className='mr-1.5 size-3.5' />
                    Restore
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : activeItems.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center py-8 text-center'>
            <FileText className='mb-2 size-12 text-muted-foreground' />
            <p className='text-muted-foreground'>No wiki pages yet</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {isAdmin && activeItems.length > 0 ? (
            <div className='flex items-center gap-2'>
              <Checkbox
                aria-label='Select all wiki pages'
                checked={selected.size === activeItems.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className='text-muted-foreground text-sm'>Select all</span>
            </div>
          ) : null}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
            {activeItems.map(w => (
              <div className='relative' key={w._id}>
                {isAdmin ? (
                  <Checkbox
                    aria-label={`Select ${w.title}`}
                    checked={selected.has(w._id)}
                    className='absolute top-2 left-2 z-10'
                    onCheckedChange={() => toggleSelect(w._id)}
                    onClick={e => e.stopPropagation()}
                  />
                ) : null}
                <Link href={`/wiki/${w.id}`}>
                  <Card className='transition-colors hover:bg-muted'>
                    <CardHeader className={isAdmin ? 'pl-10' : ''}>
                      <CardTitle>{w.title}</CardTitle>
                    </CardHeader>
                    <CardContent className='flex items-center gap-2'>
                      <span className='text-muted-foreground text-sm'>{w.slug}</span>
                      <Badge variant={w.status === 'published' ? 'default' : 'secondary'}>{w.status}</Badge>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default WikiPage
