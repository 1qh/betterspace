'use client'

import { reducers } from '@a/be/spacetimedb'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Form, useForm } from 'betterspace/components'
import { useMutation } from 'betterspace/react'
import { useRouter } from 'next/navigation'
import { useReducer } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'
import { project } from '~/schema'

const NewProjectPage = () => {
  const router = useRouter(),
    { org } = useOrg(),
    createProject = useMutation(useReducer, reducers.createProject, {
      toast: { error: 'Failed to create project', success: 'Project created' }
    }),
    form = useForm({
      onSubmit: async d => {
        await createProject({ ...d, orgId: Number(org._id) })
        router.push('/projects')
        return d
      },
      resetOnSuccess: true,
      schema: project
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
                  <Text helpText='Keep it short and clear.' name='name' placeholder='Project name' required />
                  <Text helpText='Optional context for the team.' multiline name='description' />
                  <Choose helpText='Current project state.' name='status' />
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
