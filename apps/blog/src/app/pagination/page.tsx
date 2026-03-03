'use client'

import { tables } from '@a/be/spacetimedb'
import { Spinner } from '@a/ui/spinner'
import { useList } from 'betterspace/react'
import { Check } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'
import { useSpacetimeDB, useTable } from 'spacetimedb/react'

import { Create, List } from '../common'

const Page = () => {
  const { inView, ref } = useInView(),
    [allBlogs, isReady] = useTable(tables.blog),
    { identity } = useSpacetimeDB(),
    blogs = useMemo(
      () =>
        [...allBlogs]
          .toSorted((a, b) => b.id - a.id)
          .map(b => ({ ...b, own: identity ? b.userId.isEqual(identity) : false })),
      [allBlogs, identity]
    ),
    { data, hasMore, isLoading, loadMore } = useList(blogs, isReady, {
      where: { or: [{ published: true }, { own: true }] }
    })
  useEffect(() => {
    if (inView && hasMore && !isLoading) loadMore()
  }, [hasMore, inView, isLoading, loadMore])
  return (
    <div data-testid='crud-pagination-page'>
      <Create />
      <List blogs={data} />
      {isLoading ? (
        <Spinner className='m-auto' data-testid='loading-more' />
      ) : hasMore ? (
        <p className='h-8' data-testid='load-more-trigger' ref={ref} />
      ) : (
        <Check className='m-auto animate-[fadeOut_2s_forwards] text-green-500' data-testid='pagination-exhausted' />
      )}
    </div>
  )
}

export default Page
