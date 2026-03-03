'use client'

import { tables } from '@a/be/spacetimedb'
import { Input } from '@a/ui/input'
import { useList } from 'betterspace/react'
import { Search } from 'lucide-react'
import { useTable, useSpacetimeDB } from 'spacetimedb/react'
import { useCallback, useDeferredValue, useMemo, useState } from 'react'

import { Create, List } from './common'

const Page = () => {
  const [allBlogs, isReady] = useTable(tables.blog),
    { identity } = useSpacetimeDB(),
    blogs = useMemo(
      () => allBlogs.map(b => ({ ...b, own: identity ? b.userId.isEqual(identity) : false })),
      [allBlogs, identity]
    ),
    { data, hasMore, isLoading, loadMore } = useList(blogs, isReady, {
      where: { or: [{ published: true }, { own: true }] }
    }),
    [removedIds, setRemovedIds] = useState<Set<number>>(new Set()),
    [query, setQuery] = useState(''),
    deferredQuery = useDeferredValue(query.toLowerCase()),
    filtered = data.filter(b => {
      if (removedIds.has(b.id)) return false
      if (!deferredQuery) return true
      return (
        b.title.toLowerCase().includes(deferredQuery) ||
        b.content.toLowerCase().includes(deferredQuery) ||
        b.tags?.some(t => t.toLowerCase().includes(deferredQuery))
      )
    }),
    handleRemove = useCallback((id: number) => {
      setRemovedIds(prev => new Set(prev).add(id))
    }, [])
  return (
    <div data-testid='crud-dynamic-page'>
      <Create />
      <div className='relative mb-4'>
        <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
        <Input
          className='pl-9'
          data-testid='blog-search-input'
          onChange={e => setQuery(e.target.value)}
          placeholder='Search blogs...'
          type='search'
          value={query}
        />
      </div>
      <List blogs={filtered} onRemove={handleRemove} />
      {!deferredQuery && hasMore && !isLoading ? (
        <button
          className='mx-auto mt-4 block text-sm text-muted-foreground hover:text-foreground'
          onClick={() => loadMore()}
          type='button'>
          Load more
        </button>
      ) : null}
    </div>
  )
}

export default Page
