const parseId = (val: unknown): null | number => {
    if (typeof val === 'number' && val > 0) return val
    if (typeof val === 'string') {
      const n = Number(val)
      if (Number.isFinite(n) && n > 0) return n
    }
    return null
  },
  formatDate = (ts: number) => new Date(ts).toLocaleDateString(),
  formatExpiry = (expiresAt: number) => {
    const days = Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60 * 24))
    if (days <= 0) return 'Expired'
    if (days === 1) return '1 day left'
    return `${days} days left`
  },
  toIdentityKey = (value: unknown) => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return `${value}`
    if (typeof value !== 'object' || !('toHexString' in value)) return ''
    const candidate = value as { toHexString?: () => string }
    if (typeof candidate.toHexString === 'function') return candidate.toHexString()
    return ''
  },
  sameIdentity = (a: { toHexString: () => string }, b: { toHexString: () => string }) =>
    a.toHexString() === b.toHexString(),
  withStringId = <T extends { id: number }>(item: T): T & { _id: string } => ({
    ...item,
    _id: `${item.id}`
  })

export { formatDate, formatExpiry, parseId, sameIdentity, toIdentityKey, withStringId }
