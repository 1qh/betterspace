/* eslint-disable max-statements */
'use client'

import { useCallback, useState } from 'react'

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
  onSuccess?: (count: number) => void
}

const collectSettled = <R>(settled: PromiseSettledResult<R>[]): { errors: unknown[]; results: R[] } => {
    const results: R[] = [],
      errors: unknown[] = []
    for (const s of settled)
      if (s.status === 'fulfilled') results.push(s.value)
      else errors.push(s.reason)
    return { errors, results }
  },
  useBulkMutate = <A, R = void>(mutate: (args: A) => Promise<R>, options?: UseBulkMutateOptions) => {
    const [isPending, setIsPending] = useState(false),
      [progress, setProgress] = useState<BulkProgress | null>(null),
      errorHandler = options?.onError === false ? undefined : (options?.onError ?? defaultOnError),
      run = useCallback(
        async (items: A[]): Promise<BulkResult<R>> => {
          if (items.length === 0) return { errors: [], results: [], settled: [] }
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
            if (errors.length > 0 && errorHandler) errorHandler(errors[0])
            if (results.length > 0) options?.onSuccess?.(results.length)
            return { errors, results, settled }
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
