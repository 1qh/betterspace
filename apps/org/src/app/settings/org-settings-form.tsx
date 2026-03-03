'use client'

import type { Org } from '@a/be/spacetimedb/types'

import { reducers } from '@a/be/spacetimedb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Form, useForm } from 'betterspace/components'
import { setActiveOrgCookieClient } from 'betterspace/react'
import { pickValues } from 'betterspace/zod'
import { useRouter } from 'next/navigation'
import { useReducer } from 'spacetimedb/react'
import { toast } from 'sonner'

import { orgTeam } from '~/schema'

interface OrgSettingsFormProps {
  org: Org & { _id: string }
}

const OrgSettingsForm = ({ org: o }: OrgSettingsFormProps) => {
  const router = useRouter(),
    update = useReducer(reducers.orgUpdate),
    form = useForm({
      onSubmit: async d => {
        await update({ ...d, orgId: Number(o._id) })
        toast.success('Settings updated')
        if (d.slug !== o.slug) setActiveOrgCookieClient({ orgId: o._id, slug: d.slug })

        router.push('/settings')
        return d
      },
      schema: orgTeam,
      values: pickValues(orgTeam, o)
    }),
    slug = form.watch('slug')

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization settings</CardTitle>
        <CardDescription>Update your organization details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form
          className='space-y-4'
          form={form}
          render={({ Submit, Text }) => (
            <>
              <FieldGroup>
                <Text name='name' />
                <Text name='slug' />
              </FieldGroup>
              <p className='text-xs text-muted-foreground'>/{slug}</p>
              <Submit>Save changes</Submit>
            </>
          )}
        />
      </CardContent>
    </Card>
  )
}

export default OrgSettingsForm
