'use client'

import type { OrgRole } from 'betterspace'
import type { Org, OrgMember } from '@a/be/spacetimedb/types'

import { tables } from '@a/be/spacetimedb'
import { useSpacetimeDB, useTable } from 'spacetimedb/react'
import { useRouter } from 'next/navigation'

import OrgList from './org-list'
import OrgRedirect from './org-redirect'

interface MyOrgsItem {
  org: { _id: string; avatarId?: string; name: string; slug: string }
  role: OrgRole
}

const sameIdentity = (a: Org['userId'], b: Org['userId']) => a.toHexString() === b.toHexString(),
  Page = () => {
    const router = useRouter(),
      { identity } = useSpacetimeDB(),
      [orgs] = useTable(tables.org),
      [members] = useTable(tables.orgMember)

    if (!identity) {
      router.replace('/login')
      return null
    }

    const myMemberships = members.filter((m: OrgMember) => m.userId.toHexString() === identity.toHexString()),
      myOrgs = myMemberships
        .map((m: OrgMember) => {
          const org = orgs.find((o: Org) => o.id === m.orgId)
          if (!org) return null
          const role: OrgRole = sameIdentity(org.userId, identity) ? 'owner' : m.isAdmin ? 'admin' : 'member'
          return { org: { _id: `${org.id}`, avatarId: org.avatarId, name: org.name, slug: org.slug }, role }
        })
        .filter(item => item !== null)

    if (myOrgs.length === 0) {
      router.replace('/onboarding')
      return null
    }

    if (myOrgs.length === 1) {
      const [first] = myOrgs
      if (first) return <OrgRedirect orgId={first.org._id} slug={first.org.slug} to='/dashboard' />
    }

    return (
      <div className='container py-8'>
        <h1 className='mb-6 text-2xl font-bold'>Your Organizations</h1>
        <OrgList
          orgs={myOrgs.map((o: MyOrgsItem) => ({
            avatarId: o.org.avatarId,
            id: o.org._id,
            name: o.org.name,
            role: o.role,
            slug: o.org.slug
          }))}
        />
      </div>
    )
  }

export default Page
