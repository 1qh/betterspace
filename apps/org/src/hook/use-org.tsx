'use client'

import type { Org } from '@a/be/spacetimedb/types'

import { createOrgHooks } from 'betterspace/react'

type AppOrg = Org & { _id: string }

export const { useActiveOrg, useMyOrgs, useOrg } = createOrgHooks<AppOrg>()
