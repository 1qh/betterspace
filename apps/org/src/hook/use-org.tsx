'use client'

import { api } from '@a/be'
import { createOrgHooks } from 'betterspace/react'

export const { useActiveOrg, useMyOrgs, useOrg } = createOrgHooks(api.org)
