/* oxlint-disable promise/prefer-await-to-then */
'use client'

import type { OrgJoinRequest } from '@a/be/spacetimedb/types'

import { tables } from '@a/be/spacetimedb'
import { fail } from '@a/fe/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@a/ui/avatar'
import { Button } from '@a/ui/button'
import { Switch } from '@a/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@a/ui/table'
import { useTable } from 'spacetimedb/react'
import { Check, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useOrg } from '~/hook/use-org'

const JoinRequests = () => {
  const { org } = useOrg(),
    [allRequests] = useTable(tables.orgJoinRequest),
    requests = allRequests
      .filter((r: OrgJoinRequest) => r.orgId === Number(org._id) && r.status === 'pending')
      .map((r: OrgJoinRequest) => ({ request: r, user: null })),
    approveRequest = async (_args: Record<string, unknown>) => undefined,
    rejectRequest = async (_args: Record<string, unknown>) => undefined,
    [asAdmin, setAsAdmin] = useState<Record<string, boolean>>({})

  if (requests.length === 0) return null

  type ReqId = NonNullable<typeof requests>[number]['request']['id']

  const handleApprove = (requestId: ReqId, isAdmin: boolean) => {
      approveRequest({ isAdmin, requestId })
        .then(() => toast.success('Request approved'))
        .catch(fail)
    },
    handleReject = (requestId: ReqId) => {
      rejectRequest({ requestId })
        .then(() => toast.success('Request rejected'))
        .catch(fail)
    }

  return (
    <div className='space-y-2'>
      <h3 className='font-medium'>Join Requests</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>As Admin</TableHead>
            <TableHead className='w-20' />
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map(({ request: r, user: u }) => (
            <TableRow key={r.id}>
              <TableCell className='flex items-center gap-2'>
                <Avatar className='size-6'>
                  {u?.image ? <AvatarImage src={u.image} /> : null}
                  <AvatarFallback className='text-xs'>{u?.name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <span>{u?.name ?? 'Unknown'}</span>
              </TableCell>
              <TableCell className='max-w-48 truncate text-sm text-muted-foreground'>{r.message ?? '-'}</TableCell>
              <TableCell className='text-sm text-muted-foreground'>-</TableCell>
              <TableCell>
                <Switch
                  checked={asAdmin[`${r.id}`] ?? false}
                  onCheckedChange={v => setAsAdmin(prev => ({ ...prev, [`${r.id}`]: v }))}
                />
              </TableCell>
              <TableCell className='flex gap-1'>
                <Button onClick={() => handleApprove(r.id, asAdmin[`${r.id}`] ?? false)} size='icon' variant='ghost'>
                  <Check className='size-4 text-green-600' />
                </Button>
                <Button onClick={() => handleReject(r.id)} size='icon' variant='ghost'>
                  <X className='size-4 text-red-600' />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export default JoinRequests
