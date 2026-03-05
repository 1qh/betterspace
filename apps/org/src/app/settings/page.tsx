/* oxlint-disable promise/prefer-await-to-then, promise/always-return */
/* eslint-disable no-alert */
/** biome-ignore-all lint/suspicious/noAlert: demo page uses native confirm */
'use client'

import type { OrgMember } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail } from '@a/fe/utils'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@a/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@a/ui/select'
import { clearActiveOrgCookie } from 'betterspace/next'
import { useMutation } from 'betterspace/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useReducer, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'

import OrgSettingsForm from './org-settings-form'

const OrgSettingsPage = () => {
  const router = useRouter(),
    { canDeleteOrg, isAdmin, isOwner, org } = useOrg(),
    removeOrg = useMutation(useReducer, reducers.orgRemove, {
      getName: () => `org.remove:${org._id}`,
      toast: { error: 'Failed to delete organization', success: 'Organization deleted' }
    }),
    leaveOrg = useMutation(useReducer, reducers.orgLeave, {
      getName: () => `org.leave:${org._id}`,
      toast: { error: 'Failed to leave organization', success: 'You have left the organization' }
    }),
    transferOwnership = useMutation(useReducer, reducers.orgTransferOwnership, {
      getName: () => `org.transferOwnership:${org._id}`,
      toast: { error: 'Failed to transfer ownership', success: 'Ownership transferred' }
    }),
    [allMembers] = useTable(tables.orgMember),
    members = allMembers.filter((m: OrgMember) => m.orgId === Number(org._id)),
    [transferTarget, setTransferTarget] = useState<string>('')

  if (!isAdmin)
    return <div className='text-center text-muted-foreground'>You do not have permission to access settings.</div>

  const adminMembers = members.filter(m => m.isAdmin),
    handleLeave = () => {
      if (!confirm('Are you sure you want to leave this organization?')) return
      leaveOrg({ orgId: Number(org._id) })
        .then(async () => {
          await clearActiveOrgCookie()
          router.push('/')
        })
        .catch(fail)
    },
    handleTransfer = () => {
      const target = adminMembers.find(m => m.userId.toHexString() === transferTarget)
      if (!target) return
      if (!confirm('Are you sure? You will become an admin and lose owner privileges.')) return
      transferOwnership({ newOwnerId: target.userId, orgId: Number(org._id) })
        .then(() => {
          router.refresh()
        })
        .catch(fail)
    },
    handleDelete = () => {
      if (!confirm('Are you sure? This will delete all data.')) return
      removeOrg({ orgId: Number(org._id) })
        .then(async () => {
          await clearActiveOrgCookie()
          router.push('/')
        })
        .catch(fail)
    }

  return (
    <div className='space-y-6'>
      <h1 className='font-bold text-2xl'>Settings</h1>

      <OrgSettingsForm org={org} />

      {isOwner && adminMembers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Transfer Ownership</CardTitle>
            <CardDescription>Transfer ownership to an admin. You will become an admin.</CardDescription>
          </CardHeader>
          <CardContent className='flex gap-2'>
            <Select onValueChange={setTransferTarget} value={transferTarget}>
              <SelectTrigger className='w-64'>
                <SelectValue placeholder='Select an admin' />
              </SelectTrigger>
              <SelectContent>
                {adminMembers.map(m => (
                  <SelectItem key={m.id} value={m.userId.toHexString()}>
                    {m.userId.toHexString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!transferTarget} onClick={handleTransfer} variant='outline'>
              Transfer
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isOwner ? null : (
        <Card>
          <CardHeader>
            <CardTitle>Leave Organization</CardTitle>
            <CardDescription>Remove yourself from this organization.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleLeave} variant='outline'>
              Leave organization
            </Button>
          </CardContent>
        </Card>
      )}

      {canDeleteOrg ? (
        <Card className='border-destructive'>
          <CardHeader>
            <CardTitle className='text-destructive'>Danger zone</CardTitle>
            <CardDescription>Permanently delete this organization and all its data.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDelete} variant='destructive'>
              Delete organization
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

export default OrgSettingsPage
