'use client'

import { reducers, tables } from '@a/be/spacetimedb'
import { fail } from '@a/fe/utils'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@a/ui/card'
import { Skeleton } from '@a/ui/skeleton'
import { Form, OrgAvatar, useForm } from 'betterspace/components'
import { setActiveOrgCookieClient } from 'betterspace/react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'
import { toast } from 'sonner'

import { joinRequest } from '~/schema'

const JoinPage = ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = use(params),
    router = useRouter(),
    { identity } = useSpacetimeDB(),
    [orgs] = useTable(tables.org),
    [requests] = useTable(tables.orgJoinRequest),
    [members] = useTable(tables.orgMember),
    org = orgs.find(o => o.slug === slug),
    myRequest =
      identity && org
        ? requests.find(
            r => r.orgId === org.id && r.userId.toHexString() === identity.toHexString() && r.status === 'pending'
          )
        : null,
    membership =
      identity && org ? members.find(m => m.orgId === org.id && m.userId.toHexString() === identity.toHexString()) : null,
    cancelRequest = useReducer(reducers.orgCancelJoin),
    requestJoin = useReducer(reducers.orgRequestJoin),
    form = useForm({
      onSubmit: async d => {
        if (!org) return d
        await requestJoin({ message: d.message ?? undefined, orgId: org.id })
        toast.success('Join request sent')
        return d
      },
      resetOnSuccess: true,
      schema: joinRequest
    }),
    handleCancel = async () => {
      if (!myRequest) return
      try {
        await cancelRequest({ requestId: myRequest.id })
        toast.success('Request cancelled')
      } catch (error) {
        fail(error)
      }
    }

  if (!orgs) return <Skeleton className='mx-auto h-64 max-w-md' />
  if (!org) return <div className='text-center text-muted-foreground'>Organization not found</div>

  if (membership) {
    setActiveOrgCookieClient({ orgId: `${org.id}`, slug })
    router.push('/dashboard')
    return null
  }

  return (
    <div className='mx-auto max-w-md py-12'>
      <Card>
        <CardHeader className='items-center text-center'>
          <OrgAvatar name={org.name} size='lg' src={org.avatarId ? `/api/image?id=${org.avatarId}` : undefined} />
          <CardTitle className='mt-4'>{org.name}</CardTitle>
          <CardDescription>Request to join this organization</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {myRequest ? (
            <div className='space-y-4 text-center'>
              <p className='text-muted-foreground'>Your request is pending approval.</p>
              <Button
                onClick={() => {
                  handleCancel()
                }}
                variant='outline'>
                Cancel request
              </Button>
            </div>
          ) : (
            <Form
              className='space-y-4'
              form={form}
              render={({ Submit, Text }) => (
                <>
                  <Text multiline name='message' placeholder='Optional message to the admins...' rows={3} />
                  <Submit className='w-full'>Request to Join</Submit>
                </>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default JoinPage
