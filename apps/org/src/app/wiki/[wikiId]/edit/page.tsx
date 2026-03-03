/* oxlint-disable promise/prefer-await-to-then, promise/always-return, promise/catch-or-return */
'use client'

import type { Wiki } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Skeleton } from '@a/ui/skeleton'
import { AutoSaveIndicator, Form, PermissionGuard, useForm } from 'betterspace/components'
import { pickValues } from 'betterspace/zod'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'
import { wiki as wikiSchema } from '~/schema'

const sameIdentity = (a: { toHexString: () => string }, b: { toHexString: () => string }) =>
    a.toHexString() === b.toHexString(),
  EditWikiForm = ({ wikiId }: { wikiId: number }) => {
    const router = useRouter(),
      { org } = useOrg(),
      [wikis] = useTable(tables.wiki),
      wiki = wikis.find((w: Wiki) => w.id === wikiId && w.orgId === Number(org._id)),
      remove = useReducer(reducers.rmWiki),
      update = useReducer(reducers.updateWiki),
      form = useForm({
        onSubmit: async d => {
          await update({
            content: d.content,
            deletedAt: wiki?.deletedAt,
            editors: wiki?.editors,
            expectedUpdatedAt: wiki?.updatedAt,
            id: wikiId,
            slug: d.slug,
            status: d.status,
            title: d.title
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
              <Text name='title' placeholder='Page title' />
              <Text name='slug' placeholder='my-wiki-page' />
              <Text multiline name='content' />
              <Choose name='status' />
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
