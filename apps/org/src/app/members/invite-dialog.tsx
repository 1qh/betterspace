'use client'

import { reducers } from '@a/be/spacetimedb'
import { Button } from '@a/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@a/ui/dialog'
import { Form, useForm } from 'betterspace/components'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useReducer } from 'spacetimedb/react'

import { invite } from '~/schema'

interface InviteDialogProps {
  orgId: string
}

const InviteDialog = ({ orgId }: InviteDialogProps) => {
  const [open, setOpen] = useState(false),
    sendInvite = useReducer(reducers.orgSendInvite),
    form = useForm({
      onSubmit: async d => {
        await sendInvite({ ...d, orgId: Number(orgId) })
        toast.success('Invite sent')
        setOpen(false)
        return d
      },
      resetOnSuccess: true,
      schema: invite
    })

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button>
          <Plus className='mr-2 size-4' />
          Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>Send an invite link to add someone to your organization.</DialogDescription>
        </DialogHeader>
        <Form
          className='space-y-4'
          form={form}
          render={({ Submit, Text, Toggle }) => (
            <>
              <Text name='email' placeholder='email@example.com' type='email' />
              <Toggle name='isAdmin' trueLabel='Invite as admin' />
              <Submit className='w-full'>Create invite link</Submit>
            </>
          )}
        />
      </DialogContent>
    </Dialog>
  )
}

export default InviteDialog
