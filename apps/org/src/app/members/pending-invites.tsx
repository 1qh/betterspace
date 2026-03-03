/* oxlint-disable promise/prefer-await-to-then */
'use client'

import type { OrgInvite } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail, formatExpiry } from '@a/fe/utils'
import { Button } from '@a/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@a/ui/table'
import { RoleBadge } from 'betterspace/components'
import { Copy, Trash } from 'lucide-react'
import { toast } from 'sonner'
import { useReducer, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'

const PendingInvites = () => {
  const { org } = useOrg(),
    [allInvites] = useTable(tables.orgInvite),
    invites = allInvites.filter((i: OrgInvite) => i.orgId === Number(org._id)),
    revokeInvite = useReducer(reducers.orgRevokeInvite)

  if (invites.length === 0) return null

  const handleCopy = (token: string) => {
      const url = `${window.location.origin}/invite/${token}`
      navigator.clipboard
        .writeText(url)
        .then(() => toast.success('Invite link copied'))
        .catch(() => toast.error('Failed to copy'))
    },
    handleRevoke = (inviteId: (typeof invites)[number]['id']) => {
      revokeInvite({ inviteId })
        .then(() => toast.success('Invite revoked'))
        .catch(fail)
    }

  return (
    <div className='space-y-2'>
      <h3 className='font-medium'>Pending Invites</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className='w-20' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {invites.map(i => (
            <TableRow key={i.id}>
              <TableCell>{i.email}</TableCell>
              <TableCell>
                <RoleBadge role={i.isAdmin ? 'admin' : 'member'} />
              </TableCell>
              <TableCell className='text-sm text-muted-foreground'>{formatExpiry(i.expiresAt)}</TableCell>
              <TableCell className='flex gap-1'>
                <Button onClick={() => handleCopy(i.token)} size='icon' variant='ghost'>
                  <Copy className='size-4' />
                </Button>
                <Button onClick={() => handleRevoke(i.id)} size='icon' variant='ghost'>
                  <Trash className='size-4' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default PendingInvites
