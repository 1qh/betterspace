'use client'

import type { Org, OrgMember } from '@a/be/spacetimedb/types'
import type { OrgRole } from 'betterspace'
import type { ReactNode } from 'react'

import { tables } from '@a/be/spacetimedb'
import AuthLayout from '@a/fe/auth-layout'
import SpacetimeProvider from '@a/fe/spacetimedb-provider'
import { useSpacetimeDB, useTable } from 'spacetimedb/react'
import { usePathname, useRouter } from 'next/navigation'

import OrgLayoutClient from './layout-client'
import OrgRedirect from './org-redirect'

const ORG_PATHS = ['/dashboard', '/members', '/projects', '/wiki', '/settings'],
  needsOrgLayout = (pathname: string) => {
    for (const p of ORG_PATHS) if (pathname === p || pathname.startsWith(`${p}/`)) return true
    return false
  },
  toOrgId = (id: number) => `${id}`,
  sameIdentity = (a: Org['userId'], b: Org['userId']) => a.toHexString() === b.toHexString(),
  readActiveOrgId = () => {
    if (typeof document === 'undefined') return null
    const prefix = 'active_org=',
      cookies = document.cookie.split('; ')
    for (const c of cookies) if (c.startsWith(prefix)) return c.slice(prefix.length)
    return null
  },
  toLegacyOrg = (org: Org) => ({ ...org, _id: toOrgId(org.id) }),
  OrgLayoutInner = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname(),
      router = useRouter(),
      { identity } = useSpacetimeDB(),
      [orgs] = useTable(tables.org),
      [members] = useTable(tables.orgMember)

    if (!(identity && pathname)) return <>{children}</>

    if (!needsOrgLayout(pathname)) return <>{children}</>

    const myMemberships = members.filter((m: OrgMember) => m.userId.toHexString() === identity.toHexString()),
      myOrgItems = myMemberships
        .map((m: OrgMember) => {
          const org = orgs.find((o: Org) => o.id === m.orgId)
          if (!org) return null
          const role: OrgRole = sameIdentity(org.userId, identity) ? 'owner' : m.isAdmin ? 'admin' : 'member'
          return { org: toLegacyOrg(org), role }
        })
        .filter(item => item !== null)

    if (myOrgItems.length === 0) {
      router.replace('/')
      return null
    }

    const activeOrgId = readActiveOrgId(),
      active = (activeOrgId ? myOrgItems.find(item => item.org._id === activeOrgId) : null) ?? myOrgItems[0]

    if (!active) {
      router.replace('/')
      return null
    }

    if (activeOrgId !== active.org._id) return <OrgRedirect orgId={active.org._id} slug={active.org.slug} to={pathname} />

    return (
      <OrgLayoutClient membership={null} org={active.org} orgs={myOrgItems} role={active.role}>
        {children}
      </OrgLayoutClient>
    )
  },
  Layout = ({ children }: { children: ReactNode }) => (
    <AuthLayout provider={inner => <SpacetimeProvider fileApi>{inner}</SpacetimeProvider>}>
      <OrgLayoutInner>{children}</OrgLayoutInner>
    </AuthLayout>
  )

export default Layout
