/* oxlint-disable promise/prefer-await-to-then, promise/always-return, promise/catch-or-return */
// biome-ignore-all lint/nursery/noFloatingPromises: event handler
'use client'

import type { Wiki } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { sameIdentity } from '@a/fe/utils'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Skeleton } from '@a/ui/skeleton'
import { AutoSaveIndicator, Form, PermissionGuard, useForm } from 'betterspace/components'
import { useMutation } from 'betterspace/react'
import { pickValues } from 'betterspace/zod'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'
import { wiki as wikiSchema } from '~/schema'

const EditWikiForm = ({ wikiId }: { wikiId: number }) => {
    const router = useRouter(),
      { org } = useOrg(),
      [wikis] = useTable(tables.wiki),
      wiki = wikis.find((w: Wiki) => w.id === wikiId && w.orgId === Number(org._id)),
      remove = useMutation(useReducer, reducers.rmWiki, {
        getName: () => `wiki.rm:${wikiId}`,
        toast: { error: 'Failed to delete wiki page', success: 'Wiki page deleted' }
      }),
      update = useMutation(useReducer, reducers.updateWiki, {
        getName: () => `wiki.update:${wikiId}`,
        toast: { error: 'Failed to save wiki page', success: 'Wiki page saved' }
      }),
      form = useForm({
        onSubmit: async d => {
          await update({
            ...d,
            deletedAt: wiki?.deletedAt,
            editors: wiki?.editors,
            expectedUpdatedAt: wiki?.updatedAt,
            id: wikiId
          })
          return d
        },
        schema: wikiSchema,
        values: wiki ? pickValues(wikiSchema, wiki) : undefined
      }),
      handleDelete = () => {
        remove({ id: wikiId }).then(() => router.push('/wiki'))
      }

    if (!wiki) return <Skeleton className='h-40' />

    return (
      <Form
        className='space-y-4'
        form={form}
        render={({ Choose, Text }) => (
          <>
            <FieldGroup>
              <Text helpText='Page heading shown in wiki lists.' name='title' placeholder='Page title' required />
              <Text helpText='URL-safe slug used in links.' name='slug' placeholder='my-wiki-page' required />
              <Text helpText='Optional draft content.' multiline name='content' />
              <Choose helpText='Publish when content is ready.' name='status' required />
            </FieldGroup>
            <div className='flex items-center gap-2'>
              <AutoSaveIndicator data-testid='auto-save-indicator' lastSaved={form.lastSaved} />
              <span className='flex-1' />
              <Button onClick={handleDelete} type='button' variant='destructive'>
                Delete
              </Button>
            </div>
          </>
        )}
      />
    )
  },
  EditWikiPage = ({ params }: { params: Promise<{ wikiId: string }> }) => {
    const { wikiId } = use(params),
      id = Number(wikiId),
      { isAdmin, org } = useOrg(),
      { identity } = useSpacetimeDB(),
      [wikis] = useTable(tables.wiki),
      wiki = wikis.find((w: Wiki) => w.id === id && w.orgId === Number(org._id))

    if (!(wiki && identity)) return <Skeleton className='h-40' />

    const editorsList = (wiki.editors ?? []).map(e => ({ userId: e.toHexString() })),
      canEditWiki =
        isAdmin || sameIdentity(wiki.userId, identity) || editorsList.some(e => e.userId === identity.toHexString())

    return (
      <PermissionGuard backHref={`/wiki/${wikiId}`} backLabel='wiki page' canAccess={canEditWiki} resource='wiki page'>
        <div className='flex justify-center'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <CardTitle>Edit wiki page</CardTitle>
            </CardHeader>
            <CardContent>
              <EditWikiForm wikiId={id} />
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    )
  }

export default EditWikiPage
