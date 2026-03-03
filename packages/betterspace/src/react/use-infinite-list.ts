'use client'

import { useCallback, useMemo, useState } from 'react'

import { matchW } from '../server/helpers'

type Rec = Record<string, unknown>
type SortDirection = 'asc' | 'desc'

interface SortObject<T extends Rec> {
  direction?: SortDirection
  field: keyof T & string
}

type SortMap<T extends Rec> = Partial<Record<keyof T & string, SortDirection>>
type ListSort<T extends Rec> = SortMap<T> | SortObject<T>
type WhereGroup = Rec & { own?: boolean }
type ListWhere = WhereGroup & { or?: WhereGroup[] }

interface InfiniteListOptions {
  batchSize?: number
  sort?: ListSort<Rec>
  where?: ListWhere
}

const DEFAULT_BATCH_SIZE = 50,
  getSortConfig = <T extends Rec>(sort?: ListSort<T>): null | { direction: SortDirection; field: keyof T & string } => {
    if (!sort) return null
    if ('field' in sort) return { direction: sort.direction ?? 'desc', field: sort.field }
    const keys = Object.keys(sort)
    if (!keys.length) return null
    const key = keys[0] as keyof T & string,
      direction = (sort[key] ?? 'desc') as SortDirection
    return { direction, field: key }
  },
  compareValues = (left: unknown, right: unknown): number => {
    if (left === right) return 0
    if (left === undefined || left === null) return -1
    if (right === undefined || right === null) return 1
    if (typeof left === 'number' && typeof right === 'number') return left - right
    if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
    if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime()
    return String(left).localeCompare(String(right))
  },
  sortData = <T extends Rec>(rows: T[], sort?: ListSort<T>): T[] => {
    const config = getSortConfig(sort)
    if (!config) return rows
    const factor = config.direction === 'asc' ? 1 : -1,
      out = [...rows]
    out.sort((a, b) => compareValues(a[config.field], b[config.field]) * factor)
    return out
  },
  useInfiniteList = <T extends Rec>(data: T[], isReady: boolean, options?: InfiniteListOptions) => {
    const batchSize = Math.max(1, options?.batchSize ?? DEFAULT_BATCH_SIZE),
      [visibleCount, setVisibleCount] = useState(batchSize),
      filtered = useMemo(() => {
        if (!options?.where) return data
        const out: T[] = []
        for (const row of data) if (matchW(row, options.where)) out.push(row)
        return out
      }, [data, options?.where]),
      sorted = useMemo(() => sortData(filtered, options?.sort), [filtered, options?.sort]),
      hasMore = visibleCount < sorted.length,
      sliced = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]),
      loadMore = useCallback(() => {
        if (!hasMore) return
        setVisibleCount(v => v + batchSize)
      }, [batchSize, hasMore])

    return {
      data: sliced,
      hasMore,
      isLoading: !isReady,
      loadMore
    }
  }

export type { InfiniteListOptions }
export { DEFAULT_BATCH_SIZE, useInfiniteList }
