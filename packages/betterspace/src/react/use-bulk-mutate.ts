'use client'

import { useCallback, useState } from 'react'

import { BULK_MAX } from '../constants'
import { defaultOnError } from './use-mutate'

interface BulkProgress {
  failed: number
  pending: number
  succeeded: number
  total: number
}

interface BulkResult<R> {
  errors: unknown[]
  results: R[]
  settled: PromiseSettledResult<R>[]
}

interface UseBulkMutateOptions {
  onError?: ((error: unknown) => void) | false
  onProgress?: (progress: BulkProgress) => void
  onSettled?: (result: BulkResult<unknown>) => void
  onSuccess?: (count: number) => void
}

/**
 * Splits settled promises into successful results and errors.
 * @param settled Settled mutation results.
 * @returns Collected fulfilled values and rejection reasons.
 */
const collectSettled = <R>(settled: PromiseSettledResult<R>[]): { errors: unknown[]; results: R[] } => {
    const results: R[] = [],
      errors: unknown[] = []
    for (const s of settled)
      if (s.status === 'fulfilled') results.push(s.value)
      else errors.push(s.reason)
    return { errors, results }
  },
  /**
   * Runs a mutation across many items with progress and aggregate outcomes.
   * @param mutate Mutation function called for each item.
   * @param options Optional error, progress, and completion callbacks.
   * @returns Pending state, current progress, and a `run` executor.
   */
  useBulkMutate = <A, R = void>(mutate: (args: A) => Promise<R>, options?: UseBulkMutateOptions) => {
    const [isPending, setIsPending] = useState(false),
      [progress, setProgress] = useState<BulkProgress | null>(null),
      errorHandler = options?.onError === false ? undefined : (options?.onError ?? defaultOnError),
      run = useCallback(
        async (items: A[]): Promise<BulkResult<R>> => {
          if (items.length === 0) return { errors: [], results: [], settled: [] }
          if (items.length > BULK_MAX)
            throw new Error(`Bulk operation exceeds maximum of ${BULK_MAX} items (got ${items.length})`)
          setIsPending(true)
          const total = items.length
          let succeeded = 0,
            failed = 0
          const report = () => {
            const p: BulkProgress = { failed, pending: total - succeeded - failed, succeeded, total }
            setProgress(p)
            options?.onProgress?.(p)
          }
          report()
          try {
            const track = async (item: A): Promise<R> => {
                try {
                  const result = await mutate(item)
                  succeeded += 1
                  report()
                  return result
                } catch (trackError) {
                  failed += 1
                  report()
                  throw trackError
                }
              },
              tasks: Promise<R>[] = []
            for (const item of items) tasks.push(track(item))
            const settled = await Promise.allSettled(tasks),
              { errors, results } = collectSettled(settled)
            if (errors.length > 0 && errorHandler) {
              errorHandler(errors[0])
              if (errors.length > 1) {
                // eslint-disable-next-line no-console
                console.error(`[betterspace] Bulk operation: ${errors.length} of ${items.length} items failed`)
                for (let i = 1; i < errors.length; i += 1) console.error(`[betterspace] Bulk error ${i + 1}:`, errors[i]) // eslint-disable-line no-console
              }
            }
            if (results.length > 0) options?.onSuccess?.(results.length)
            const bulkResult = { errors, results, settled }
            options?.onSettled?.(bulkResult)
            return bulkResult
          } finally {
            setIsPending(false)
            setProgress(null)
          }
        },
        [errorHandler, mutate, options]
      )

    return { isPending, progress, run }
  }

export type { BulkProgress, BulkResult, UseBulkMutateOptions }
export { collectSettled, useBulkMutate }
