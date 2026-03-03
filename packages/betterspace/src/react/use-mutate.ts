/* eslint-disable max-statements, complexity */
'use client'

import { useCallback } from 'react'
import { toast } from 'sonner'

import type { MutationType } from './optimistic-store'

import { extractErrorData, getErrorMessage, handleError } from '../server/helpers'
import { completeMutation, pushError, trackMutation } from './devtools'
import { makeTempId, useOptimisticStore } from './optimistic-store'

interface MutateOptions<A extends Record<string, unknown>> {
  getName?: (args: A) => string
  onError?: ((error: unknown) => void) | false
  optimistic?: boolean
  resolveId?: (args: A) => string | undefined
  type?: MutationType
}

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production',
  defaultOnError = (error: unknown) => {
    handleError(error, {
      default: () => {
        toast.error(getErrorMessage(error))
      },
      NOT_AUTHENTICATED: () => {
        toast.error('Please log in')
      },
      RATE_LIMITED: () => {
        const data = extractErrorData(error)
        toast.error(
          data?.retryAfter
            ? `Too many requests, retry in ${Math.ceil(data.retryAfter / 1000)}s`
            : 'Too many requests, try again later'
        )
      }
    })
  },
  detectMutationType = (name: string): MutationType => {
    if (name.endsWith(':rm') || name.endsWith('.rm') || name.includes('delete') || name.includes('remove')) return 'delete'
    if (name.endsWith(':update') || name.endsWith('.update') || name.includes('patch')) return 'update'
    return 'create'
  },
  useMutate = <A extends Record<string, unknown>, R = void>(
    mutate: (args: A) => Promise<R>,
    options?: MutateOptions<A>
  ): ((args: A) => Promise<R>) => {
    const store = useOptimisticStore(),
      isOptimistic = options?.optimistic !== false,
      errorHandler = options?.onError === false ? undefined : (options?.onError ?? defaultOnError)

    return useCallback(
      async (args: A): Promise<R> => {
        const name = options?.getName?.(args) ?? (mutate.name || 'mutation'),
          type = options?.type ?? detectMutationType(name),
          devId = isDev ? trackMutation(name, args) : 0

        if (!(store && isOptimistic)) {
          try {
            const result = await mutate(args)
            if (isDev && devId) completeMutation(devId, 'success')
            return result
          } catch (error) {
            if (isDev) {
              if (devId) completeMutation(devId, 'error')
              pushError(error)
            }
            if (errorHandler) errorHandler(error)
            throw error
          }
        }

        const tempId = makeTempId(),
          id = options?.resolveId?.(args) ?? (typeof args.id === 'string' ? args.id : tempId)
        store.add({
          args,
          id,
          tempId,
          timestamp: Date.now(),
          type
        })

        try {
          const result = await mutate(args)
          if (isDev && devId) completeMutation(devId, 'success')
          return result
        } catch (error) {
          if (isDev) {
            if (devId) completeMutation(devId, 'error')
            pushError(error)
          }
          if (errorHandler) errorHandler(error)
          throw error
        } finally {
          store.remove(tempId)
          if (id !== tempId) store.reconcileIds([id])
        }
      },
      [errorHandler, isOptimistic, mutate, options, store]
    )
  }

export type { MutateOptions }
export { defaultOnError, useMutate }
