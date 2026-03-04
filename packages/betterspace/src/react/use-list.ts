'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { ComparisonOp } from '../server/types'

import { matchW } from '../server/helpers'

type ListSort<T extends Rec> = SortMap<T> | SortObject<T>
type ListWhere<T extends Rec> = WhereGroup<T> & { or?: WhereGroup<T>[] }

type Rec = Record<string, unknown>

type SortDirection = 'asc' | 'desc'
type SortMap<T extends Rec> = Partial<Record<keyof T & string, SortDirection>>

interface SortObject<T extends Rec> {
  direction?: SortDirection
  field: keyof T & string
}
/** Client-side list options for filtering, sorting, searching, and pagination. */
interface UseListOptions<T extends Rec = Rec> {
  page?: number
  pageSize?: number
  search?: { debounceMs?: number; fields: (keyof T & string)[]; query: string }
  sort?: ListSort<T>
  where?: ListWhere<T>
}

type WhereFieldValue<V> = ComparisonOp<V> | V
type WhereGroup<T extends Rec> = { [K in keyof T & string]?: WhereFieldValue<T[K]> } & { own?: boolean }

/** Default page size used by `useList`. */
const DEFAULT_PAGE_SIZE = 50,
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
  sortData = <T extends Rec>(rows: readonly T[], sort?: ListSort<T>): T[] => {
    const config = getSortConfig(sort)
    if (!config) return [...rows]
    const factor = config.direction === 'asc' ? 1 : -1,
      out = [...rows]
    out.sort((a, b) => compareValues(a[config.field], b[config.field]) * factor)
    return out
  },
  /** Builds a paginated, filterable, searchable list view from in-memory rows.
   * @param data - Source rows
   * @param isReady - Subscription readiness state
   * @param options - Pagination, filtering, sorting, and search options
   * @returns List state and pagination controls
   * @example
   * ```ts
   * const list = useList(rows, ready, {
   *   pageSize: 20,
   *   where: { own: true },
   *   search: { query: 'hello', fields: ['title', 'content'] }
   * })
   * ```
   */

  /** biome-ignore lint/suspicious/noEmptyBlockStatements: noop */
  noop = () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
  SKIP_RESULT = {
    data: [] as never[],
    hasMore: false,
    isLoading: true,
    loadMore: noop,
    page: 1,
    totalCount: 0
  },
  useList = <T extends Rec>(data: readonly T[], isReady: boolean, options?: 'skip' | UseListOptions<T>) => {
    const skipped = options === 'skip',
      opts = skipped ? undefined : options,
      pageSize = opts?.pageSize ?? DEFAULT_PAGE_SIZE,
      rawQuery = opts?.search?.query ?? '',
      debounceMs = opts?.search?.debounceMs,
      [debouncedQuery, setDebouncedQuery] = useState(rawQuery),
      [currentPage, setCurrentPage] = useState(opts?.page ?? 1),
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
      if (whereChanged || searchChanged) setCurrentPage(1)
    }, [opts?.where, searchQuery])

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
      totalCount = sorted.length,
      cappedPageSize = Math.max(1, pageSize),
      visibleCount = currentPage * cappedPageSize,
      pagedData = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]),
      hasMore = visibleCount < totalCount,
      loadMore = useCallback(() => {
        if (!hasMore) return
        setCurrentPage(p => p + 1)
      }, [hasMore])

    useEffect(() => {
      if (opts?.page === undefined) return
      setCurrentPage(Math.max(1, opts.page))
    }, [opts?.page])

    useEffect(() => {
      const maxPage = Math.max(1, Math.ceil(totalCount / cappedPageSize))
      if (currentPage > maxPage) setCurrentPage(maxPage)
    }, [cappedPageSize, currentPage, totalCount])

    if (skipped) return SKIP_RESULT

    return {
      data: pagedData,
      hasMore,
      isLoading: !isReady,
      loadMore,
      page: currentPage,
      totalCount
    }
  },
  /** Computes an `own` boolean on each row using a predicate function.
   * @param rows - Source rows
   * @param isOwn - Predicate returning true for owned rows, or null/undefined to mark all false
   * @returns Rows augmented with `own` field
   * @example
   * ```ts
   * const blogs = useOwnRows(allBlogs, identity ? b => b.userId.isEqual(identity) : null)
   * ```
   */
  useOwnRows = <T extends Rec>(
    rows: readonly T[],
    isOwn: ((row: T) => boolean) | null | undefined
  ): (T & { own: boolean })[] =>
    useMemo(() => {
      const out: (T & { own: boolean })[] = []
      for (const row of rows) out.push({ ...row, own: isOwn ? isOwn(row) : false })
      return out
    }, [rows, isOwn])

export type { ListWhere, UseListOptions, WhereGroup }
export { DEFAULT_PAGE_SIZE, useList, useOwnRows }
