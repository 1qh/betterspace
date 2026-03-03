'use client'

import { reducers } from '@a/be/spacetimedb'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Form, useForm } from 'betterspace/components'
import { useRouter } from 'next/navigation'
import { useReducer } from 'spacetimedb/react'
import { toast } from 'sonner'

import { useOrg } from '~/hook/use-org'
import { wiki } from '~/schema'

const NewWikiPage = () => {
  const router = useRouter(),
    { org } = useOrg(),
    createWiki = useReducer(reducers.createWiki),
    form = useForm({
      onSubmit: async d => {
        await createWiki({ ...d, orgId: Number(org._id) })
        toast.success('Wiki page created')
        router.push('/wiki')
        return d
      },
      resetOnSuccess: true,
      schema: wiki
    })

  return (
    <div className='flex justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle>Create wiki page</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            className='space-y-4'
            form={form}
            render={({ Choose, Submit, Text }) => (
              <>
                <FieldGroup>
                  <Text name='title' placeholder='Page title' />
                  <Text name='slug' placeholder='my-wiki-page' />
                  <Text multiline name='content' />
                  <Choose name='status' />
                </FieldGroup>
                <Submit className='w-full'>Create wiki page</Submit>
              </>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default NewWikiPage
