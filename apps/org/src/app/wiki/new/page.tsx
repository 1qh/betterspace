'use client'

import { reducers } from '@a/be/spacetimedb'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Form, useForm } from 'betterspace/components'
import { useMutation } from 'betterspace/react'
import { useRouter } from 'next/navigation'
import { useReducer } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'
import { wiki } from '~/schema'

const NewWikiPage = () => {
  const router = useRouter(),
    { org } = useOrg(),
    createWiki = useMutation(useReducer, reducers.createWiki, {
      getName: () => 'wiki.create',
      toast: { error: 'Failed to create wiki page', success: 'Wiki page created' }
    }),
    form = useForm({
      onSubmit: async d => {
        await createWiki({
          content: d.content,
          deletedAt: undefined,
          editors: undefined,
          orgId: Number(org._id),
          slug: d.slug,
          status: d.status,
          title: d.title
        })
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
                  <Text helpText='Page heading shown in wiki lists.' name='title' placeholder='Page title' required />
                  <Text helpText='URL-safe slug used in links.' name='slug' placeholder='my-wiki-page' required />
                  <Text helpText='Optional draft content.' multiline name='content' />
                  <Choose helpText='Publish when content is ready.' name='status' required />
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
