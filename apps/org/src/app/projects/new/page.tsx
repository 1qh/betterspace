'use client'

import { reducers } from '@a/be/spacetimedb'
import { orgScoped } from '@a/be/t'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Form, useForm } from 'betterspace/components'
import { useRouter } from 'next/navigation'
import { useReducer } from 'spacetimedb/react'
import { toast } from 'sonner'

import { useOrg } from '~/hook/use-org'

const NewProjectPage = () => {
  const router = useRouter(),
    { org } = useOrg(),
    createProject = useReducer(reducers.createProject),
    form = useForm({
      onSubmit: async d => {
        await createProject({ ...d, orgId: Number(org._id) })
        toast.success('Project created')
        router.push('/projects')
        return d
      },
      resetOnSuccess: true,
      schema: orgScoped.project
    })

  return (
    <div className='flex justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Create project</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            className='space-y-4'
            form={form}
            render={({ Choose, Submit, Text }) => (
              <>
                <FieldGroup>
                  <Text name='name' placeholder='Project name' />
                  <Text multiline name='description' />
                  <Choose name='status' />
                </FieldGroup>
                <Submit className='w-full'>Create project</Submit>
              </>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default NewProjectPage
