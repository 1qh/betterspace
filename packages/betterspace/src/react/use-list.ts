'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { matchW } from '../server/helpers'

type ListSort<T extends Rec> = SortMap<T> | SortObject<T>
type ListWhere = WhereGroup & { or?: WhereGroup[] }

type Rec = Record<string, unknown>

type SortDirection = 'asc' | 'desc'
type SortMap<T extends Rec> = Partial<Record<keyof T & string, SortDirection>>

interface SortObject<T extends Rec> {
  direction?: SortDirection
  field: keyof T & string
}
/** Client-side list options for filtering, sorting, and pagination. */
interface UseListOptions {
  page?: number
  pageSize?: number
  sort?: ListSort<Rec>
  where?: ListWhere
}

type WhereGroup = Rec & { own?: boolean }

/** Default page size used by `useList`. */
const DEFAULT_PAGE_SIZE = 50,
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
  /** Builds a paginated, filterable list view from in-memory rows.
   * @param data - Source rows
   * @param isReady - Subscription readiness state
   * @param options - Pagination and filtering options
   * @returns List state and pagination controls
   * @example
   * ```ts
   * const list = useList(rows, ready, { pageSize: 20, where: { own: true } })
   * ```
   */
  useList = <T extends Rec>(data: T[], isReady: boolean, options?: UseListOptions) => {
    const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE,
      [currentPage, setCurrentPage] = useState(options?.page ?? 1),
      filtered = useMemo(() => {
        if (!options?.where) return data
        const out: T[] = []
        for (const row of data) if (matchW(row, options.where)) out.push(row)
        return out
      }, [data, options?.where]),
      sorted = useMemo(() => sortData(filtered, options?.sort), [filtered, options?.sort]),
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
      if (options?.page === undefined) return
      setCurrentPage(Math.max(1, options.page))
    }, [options?.page])

    useEffect(() => {
      const maxPage = Math.max(1, Math.ceil(totalCount / cappedPageSize))
      if (currentPage > maxPage) setCurrentPage(maxPage)
    }, [cappedPageSize, currentPage, totalCount])

    return {
      data: pagedData,
      hasMore,
      isLoading: !isReady,
      loadMore,
      page: currentPage,
      totalCount
    }
  }

export type { UseListOptions }
export { DEFAULT_PAGE_SIZE, useList }
