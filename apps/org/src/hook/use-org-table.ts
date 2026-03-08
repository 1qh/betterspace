'use client'

import { useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'

const useOrgTable = (table: Parameters<typeof useTable>[0]) => {
  const { org } = useOrg(),
    [rows, isReady] = useTable(table),
    numericId = Number(org._id),
    filtered: (typeof rows)[number][] = []
  for (const r of rows) if ((r as unknown as { orgId: number }).orgId === numericId) filtered.push(r)

  return [filtered, isReady] as const
}

export { useOrgTable }
