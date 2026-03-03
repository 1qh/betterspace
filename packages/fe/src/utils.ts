import type { Id, TableNames } from '@a/be/model'

import { toast } from 'sonner'

const getCode = (error: unknown) => {
    if (typeof error !== 'object' || error === null || !('code' in error)) return
    const { code } = error
    return code
  },
  getMessage = (error: unknown) => {
    if (typeof error !== 'object' || error === null || !('message' in error)) return
    const { message } = error
    return typeof message === 'string' && message.length > 0 ? message : undefined
  },
  fail = (error: unknown) => {
    const code = getCode(error)
    if (code === 'NOT_AUTHENTICATED') {
      toast.error('Please log in')
      return
    }
    if (code === 'RATE_LIMITED') {
      toast.error('Too many requests, try again later')
      return
    }
    toast.error(getMessage(error) ?? 'Unknown error')
  },
  isId = <T extends TableNames>(val: unknown): val is Id<T> => typeof val === 'string' && val.length > 0,
  formatDate = (ts: number) => new Date(ts).toLocaleDateString(),
  formatExpiry = (expiresAt: number) => {
    const days = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Expired'
    if (days === 1) return '1 day left'
    return `${days} days left`
  }

export { fail, formatDate, formatExpiry, isId }
