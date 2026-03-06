'use client'

import type { Org } from '@a/be/spacetimedb/types'

import { createOrgHooks } from 'betterspace/react'

const { useActiveOrg, useMyOrgs, useOrg, useOrgMutation } = createOrgHooks<Org & { _id: string }>({
  orgIdForMutation: Number
})

export { useActiveOrg, useMyOrgs, useOrg, useOrgMutation }
