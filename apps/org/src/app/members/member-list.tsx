/* oxlint-disable promise/prefer-await-to-then */
'use client'

import type { OrgMember } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail } from '@a/fe/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@a/ui/avatar'
import { Button } from '@a/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@a/ui/dropdown-menu'
import { Skeleton } from '@a/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@a/ui/table'
import { RoleBadge } from 'betterspace/components'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { toast } from 'sonner'

import { useOrg } from '~/hook/use-org'

const MemberList = () => {
  const { canManageAdmins, canManageMembers, org, role: myRole } = useOrg(),
    { identity } = useSpacetimeDB(),
    [allMembers] = useTable(tables.orgMember),
    members = allMembers
      .filter((m: OrgMember) => m.orgId === Number(org._id))
      .map((m: OrgMember) => {
        const role = m.userId.toHexString() === org.userId.toHexString() ? 'owner' : m.isAdmin ? 'admin' : 'member'
        return { memberId: `${m.id}`, role, user: null, userId: m.userId.toHexString() }
      }),
    removeMember = useReducer(reducers.orgRemoveMember),
    setAdmin = useReducer(reducers.orgSetAdmin)

  if (!identity) return <Skeleton className='h-40 w-full' />

  type MemberId = NonNullable<(typeof members)[number]['memberId']>

  const handleRemove = (memberId: MemberId) => {
      removeMember({ memberId })
        .then(() => toast.success('Member removed'))
        .catch(fail)
    },
    handleToggleAdmin = (memberId: MemberId, isAdmin: boolean) => {
      setAdmin({ isAdmin: !isAdmin, memberId })
        .then(() => toast.success(isAdmin ? 'Demoted to member' : 'Promoted to admin'))
        .catch(fail)
    }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          {canManageMembers ? <TableHead className='w-10' /> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map(m => {
          const { memberId } = m,
            showActions = m.role !== 'owner' && memberId
          return (
            <TableRow key={m.userId}>
              <TableCell className='flex items-center gap-2'>
                <Avatar className='size-8'>
                  {m.user?.image ? <AvatarImage src={m.user.image} /> : null}
                  <AvatarFallback>{m.user?.name?.slice(0, 2).toUpperCase() ?? '??'}</AvatarFallback>
                </Avatar>
                <span>{m.user?.name ?? 'Unknown'}</span>
              </TableCell>
              <TableCell>
                <RoleBadge role={m.role} />
              </TableCell>
              {canManageMembers ? (
                <TableCell>
                  {showActions ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size='icon' variant='ghost'>
                          <MoreHorizontal className='size-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        {canManageAdmins ? (
                          <DropdownMenuItem onSelect={() => handleToggleAdmin(memberId, m.role === 'admin')}>
                            {m.role === 'admin' ? 'Demote to member' : 'Promote to admin'}
                          </DropdownMenuItem>
                        ) : null}
                        {(myRole === 'owner' || m.role === 'member') && (
                          <DropdownMenuItem className='text-destructive' onSelect={() => handleRemove(memberId)}>
                            <UserMinus className='mr-2 size-4' />
                            Remove
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export default MemberList
