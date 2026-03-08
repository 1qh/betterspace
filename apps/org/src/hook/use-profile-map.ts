'use client'

import type { OrgProfile } from '@a/be/spacetimedb/types'

import { tables } from '@a/be/spacetimedb'
import { useTable } from 'spacetimedb/react'

const useProfileMap = () => {
  const [profiles] = useTable(tables.orgProfile),
    map = new Map<string, OrgProfile>()
  for (const p of profiles) map.set(p.userId.toHexString(), p)
  return map
}

export { useProfileMap }
