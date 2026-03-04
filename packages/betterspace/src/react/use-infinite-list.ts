'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ComparisonOp } from '../server/types'

import { matchW } from '../server/helpers'

/** Client-side infinite-list options for filtering, sorting, and searching. */
interface InfiniteListOptions<T extends Rec = Rec> {
  batchSize?: number
  search?: { debounceMs?: number; fields: (keyof T & string)[]; query: string }
  sort?: ListSort<T>
  where?: ListWhere<T>
}
type ListSort<T extends Rec> = SortMap<T> | SortObject<T>

type ListWhere<T extends Rec> = WhereGroup<T> & { or?: WhereGroup<T>[] }

type Rec = Record<string, unknown>
type SortDirection = 'asc' | 'desc'
type SortMap<T extends Rec> = Partial<Record<keyof T & string, SortDirection>>
interface SortObject<T extends Rec> {
  direction?: SortDirection
  field: keyof T & string
}

type WhereFieldValue<V> = ComparisonOp<V> | V
type WhereGroup<T extends Rec> = { [K in keyof T & string]?: WhereFieldValue<T[K]> } & { own?: boolean }

/** Default batch size used by `useInfiniteList`. */
const DEFAULT_BATCH_SIZE = 50,
  toSortableString = (value: unknown): string => {
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value)
    if (typeof value === 'object' && value !== null)
      try {
        return JSON.stringify(value)
      } catch {
        return Object.prototype.toString.call(value)
      }

    return ''
  },
  getSortConfig = <T extends Rec>(sort?: ListSort<T>): null | { direction: SortDirection; field: keyof T & string } => {
    if (!sort) return null
    if ('field' in sort)
      return {
        direction: (sort as SortObject<T>).direction ?? 'desc',
        field: (sort as SortObject<T>).field
      }
    const keys = Object.keys(sort)
    if (!keys.length) return null
    const key = keys[0] as keyof T & string,
      direction = (sort as Record<string, SortDirection>)[key] ?? 'desc'
    return { direction, field: key }
  },
  compareValues = (left: unknown, right: unknown): number => {
    if (left === right) return 0
    if (left === undefined || left === null) return -1
    if (right === undefined || right === null) return 1
    if (typeof left === 'number' && typeof right === 'number') return left - right
    if (typeof left === 'boolean' && typeof right === 'boolean') return Number(left) - Number(right)
    if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime()
    return toSortableString(left).localeCompare(toSortableString(right))
  },
  sortData = <T extends Rec>(rows: T[], sort?: ListSort<T>): T[] => {
    const config = getSortConfig(sort)
    if (!config) return rows
    const factor = config.direction === 'asc' ? 1 : -1,
      out = [...rows]
    out.sort((a, b) => compareValues(a[config.field], b[config.field]) * factor)
    return out
  },
  /** Builds an infinite-scroll list from in-memory rows.
   * @param data - Source rows
   * @param isReady - Subscription readiness state
   * @param options - Sorting and filter options
   * @returns List slice and load-more controls
   * @example
   * ```ts
   * const list = useInfiniteList(rows, ready, { batchSize: 25 })
   * ```
   */
  searchMatches = <T extends Rec>(row: T, query: string, fields: (keyof T & string)[]): boolean => {
    const lower = query.toLowerCase()
    for (const field of fields) {
      const val = row[field]
      if (typeof val === 'string' && val.toLowerCase().includes(lower)) return true
      if (Array.isArray(val))
        for (const item of val) if (typeof item === 'string' && item.toLowerCase().includes(lower)) return true
    }
    return false
  },
  /** biome-ignore lint/suspicious/noEmptyBlockStatements: noop */
  noop = () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
  SKIP_RESULT = {
    data: [] as never[],
    hasMore: false,
    isLoading: true,
    loadMore: noop,
    totalCount: 0
  },
  useInfiniteList = <T extends Rec>(data: T[], isReady: boolean, options?: 'skip' | InfiniteListOptions<T>) => {
    const skipped = options === 'skip',
      opts = skipped ? undefined : options,
      batchSize = Math.max(1, opts?.batchSize ?? DEFAULT_BATCH_SIZE),
      rawQuery = opts?.search?.query ?? '',
      debounceMs = opts?.search?.debounceMs,
      [debouncedQuery, setDebouncedQuery] = useState(rawQuery),
      [visibleCount, setVisibleCount] = useState(batchSize),
      whereRef = useRef(opts?.where),
      searchQueryRef = useRef(rawQuery)

    useEffect(() => {
      if (!debounceMs) {
        setDebouncedQuery(rawQuery)
        return
      }
      const id = setTimeout(() => setDebouncedQuery(rawQuery), debounceMs)
      return () => clearTimeout(id)
    }, [debounceMs, rawQuery])

    const searchQuery = debounceMs ? debouncedQuery : rawQuery

    useEffect(() => {
      const whereChanged = whereRef.current !== opts?.where,
        searchChanged = searchQueryRef.current !== searchQuery
      whereRef.current = opts?.where
      searchQueryRef.current = searchQuery
      if (whereChanged || searchChanged) setVisibleCount(batchSize)
    }, [batchSize, opts?.where, searchQuery])

    const filtered = useMemo(() => {
        if (skipped || !opts?.where) return skipped ? [] : data
        const out: T[] = []
        for (const row of data) if (matchW(row, opts.where)) out.push(row)
        return out
      }, [data, opts?.where, skipped]),
      searched = useMemo(() => {
        if (skipped) return []
        const fields = opts?.search?.fields ?? []
        if (searchQuery === '' || fields.length === 0) return filtered
        const out: T[] = []
        for (const row of filtered) if (searchMatches(row, searchQuery, fields)) out.push(row)
        return out
      }, [filtered, searchQuery, opts?.search?.fields, skipped]),
      sorted = useMemo(() => (skipped ? [] : sortData(searched, opts?.sort)), [searched, opts?.sort, skipped]),
      hasMore = visibleCount < sorted.length,
      sliced = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]),
      loadMore = useCallback(() => {
        if (!hasMore) return
        setVisibleCount(v => v + batchSize)
      }, [batchSize, hasMore])

    if (skipped) return SKIP_RESULT

    return {
      data: sliced,
      hasMore,
      isLoading: !isReady,
      loadMore,
      totalCount: sorted.length
    }
  }

export type { InfiniteListOptions, ListWhere as InfiniteListWhere }
export { DEFAULT_BATCH_SIZE, useInfiniteList }
