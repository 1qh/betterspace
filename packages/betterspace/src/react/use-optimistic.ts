'use client'

import { useCallback, useRef, useState } from 'react'

interface OptimisticOptions<A, R = void> {
  mutate: (args: A) => Promise<R>
  onOptimistic?: (args: A) => void
  onRollback?: (args: A, catchError: Error) => void
  onSuccess?: (result: R, args: A) => void
}

const useOptimisticMutation = <A, R = void>({ mutate, onOptimistic, onRollback, onSuccess }: OptimisticOptions<A, R>) => {
  const [isPending, setIsPending] = useState(false),
    [mutationError, setMutationError] = useState<Error | null>(null),
    pendingCountRef = useRef(0),
    execute = useCallback(
      async (args: A): Promise<R | null> => {
        pendingCountRef.current += 1
        setIsPending(true)
        setMutationError(null)
        onOptimistic?.(args)
        try {
          const result = await mutate(args)
          onSuccess?.(result, args)
          return result
        } catch (error) {
          const err = error instanceof Error ? error : new Error('Mutation failed')
          setMutationError(err)
          onRollback?.(args, err)
          return null
        } finally {
          pendingCountRef.current -= 1
          if (pendingCountRef.current === 0) setIsPending(false)
        }
      },
      [mutate, onOptimistic, onRollback, onSuccess]
    )

  return { error: mutationError, execute, isPending }
}

export type { OptimisticOptions }
export { useOptimisticMutation }
