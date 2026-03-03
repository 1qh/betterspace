'use client'

import { useEffect, useMemo, useState } from 'react'

type Rec = Record<string, unknown>

interface UseSearchOptions {
  debounceMs?: number
  fields: string[]
  query: string
}

interface UseSearchResult<T> {
  isSearching: boolean
  results: T[]
}

const normalizeQuery = (query: string): string => query.trim().toLowerCase(),
  rowMatchesQuery = <T extends Rec>(row: T, fields: string[], normalizedQuery: string): boolean => {
    for (const field of fields) {
      const value = row[field]
      if (String(value).toLowerCase().includes(normalizedQuery)) return true
    }
    return false
  },
  filterSearchData = <T extends Rec>(rows: T[], fields: string[], normalizedQuery: string): T[] => {
    if (!normalizedQuery) return rows
    const out: T[] = []
    for (const row of rows) if (rowMatchesQuery(row, fields, normalizedQuery)) out.push(row)
    return out
  },
  DEFAULT_DEBOUNCE_MS = 300,
  useSearch = <T extends Rec>(data: T[], isReady: boolean, options: UseSearchOptions): UseSearchResult<T> => {
    const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS,
      [debouncedQuery, setDebouncedQuery] = useState(options.query)

    useEffect(() => {
      const id = setTimeout(() => setDebouncedQuery(options.query), debounceMs)
      return () => clearTimeout(id)
    }, [debounceMs, options.query])

    const results = useMemo(() => {
        if (!isReady) return []
        return filterSearchData(data, options.fields, normalizeQuery(debouncedQuery))
      }, [data, debouncedQuery, isReady, options.fields]),
      isSearching = options.query !== debouncedQuery || !isReady

    return { isSearching, results }
  }

export type { UseSearchOptions, UseSearchResult }
export { DEFAULT_DEBOUNCE_MS, useSearch }
