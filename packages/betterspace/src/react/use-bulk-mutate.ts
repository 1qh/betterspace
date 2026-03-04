'use client'

import { useCallback, useState } from 'react'

import { defaultOnError } from './use-mutate'

interface BulkResult<R> {
  errors: unknown[]
  results: R[]
  settled: PromiseSettledResult<R>[]
}

interface UseBulkMutateOptions {
  onError?: ((error: unknown) => void) | false
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
      errorHandler = options?.onError === false ? undefined : (options?.onError ?? defaultOnError),
      run = useCallback(
        async (items: A[]): Promise<BulkResult<R>> => {
          if (items.length === 0) return { errors: [], results: [], settled: [] }
          setIsPending(true)
          try {
            const tasks: Promise<R>[] = []
            for (const item of items) tasks.push(mutate(item))
            const settled = await Promise.allSettled(tasks),
              { errors, results } = collectSettled(settled)
            if (errors.length > 0 && errorHandler) errorHandler(errors[0])
            if (results.length > 0) options?.onSuccess?.(results.length)
            return { errors, results, settled }
          } finally {
            setIsPending(false)
          }
        },
        [errorHandler, mutate, options]
      )

    return { isPending, run }
  }

export type { BulkResult, UseBulkMutateOptions }
export { collectSettled, useBulkMutate }
