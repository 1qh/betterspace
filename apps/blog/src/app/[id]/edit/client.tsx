// biome-ignore-all lint/style/noProcessEnv: intentional process.env access
'use client'

import type { Blog } from '@a/be/spacetimedb/types'
import type { ComponentProps } from 'react'

import { reducers } from '@a/be/spacetimedb'
import { cn } from '@a/ui'
import { FieldGroup } from '@a/ui/field'
import { Label } from '@a/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@a/ui/popover'
import { Spinner } from '@a/ui/spinner'
import { Switch } from '@a/ui/switch'
import { AutoSaveIndicator, Form, useForm } from 'betterspace/components'
import { toastFieldError, useMutation } from 'betterspace/react'
import { Settings } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { useReducer, useSpacetimeDB } from 'spacetimedb/react'

import { editBlog } from '~/schema'

const Publish = ({
    className,
    id,
    published,
    ...props
  }: Omit<ComponentProps<'div'>, 'id'> & { id: number; published: boolean }) => {
    const update = useMutation(useReducer, reducers.updateBlog, {
        getName: () => 'blog.update.publish',
        toast: {
          error: 'Failed to update publish status',
          success: (_result, args) => (args.published ? 'Published' : 'Unpublished')
        }
      }),
      [pending, go] = useTransition()
    return (
      <div className={cn('flex items-center gap-2', className)} data-testid='publish-toggle' {...props}>
        <Label htmlFor='publish'>{pending ? <Spinner /> : published ? 'Published' : 'Draft'}</Label>
        <Switch
          checked={published}
          data-testid='publish-switch'
          disabled={pending}
          id='publish'
          onCheckedChange={() =>
            go(async () => {
              await update({
                attachments: undefined,
                category: undefined,
                content: undefined,
                coverImage: undefined,
                expectedUpdatedAt: undefined,
                id,
                published: !published,
                tags: undefined,
                title: undefined
              })
            })
          }
          size='default'
        />
      </div>
    )
  },
  Edit = ({ blog }: { blog: Blog }) => {
    const update = useMutation(useReducer, reducers.updateBlog, {
        getName: () => 'blog.update.edit',
        toast: { error: 'Autosave failed', success: 'Saved' }
      }),
      form = useForm({
        autoSave: { debounceMs: 2000, enabled: true },
        onSubmit: async d => {
          const payload = {
            attachments: d.attachments,
            category: d.category,
            content: d.content,
            coverImage: d.coverImage ?? undefined,
            expectedUpdatedAt: undefined,
            id: blog.id,
            published: d.published,
            tags: d.tags,
            title: d.title
          }
          try {
            await update(payload)
          } catch (error) {
            toastFieldError(error, message => {
              toast.error(message)
            })
            throw error
          }
          return d
        },
        schema: editBlog,
        values: {
          attachments: blog.attachments ?? [],
          content: blog.content,
          coverImage: blog.coverImage ?? null,
          tags: blog.tags,
          title: blog.title
        }
      })
    return (
      <Form
        className='flex flex-col gap-3'
        data-testid='edit-blog-form'
        form={form}
        render={({ Arr, Err, File, Files, Text }) => (
          <>
            <Err error={form.error} />
            <FieldGroup className='gap-5'>
              <Text data-testid='edit-title' helpText='A clear title improves discoverability.' name='title' required />
              <Text
                className='min-h-64'
                data-testid='edit-content'
                helpText='Keep it readable and specific.'
                multiline
                name='content'
                required
              />
              <File
                accept='image/*'
                data-testid='edit-cover-image'
                helpText='Optional cover image.'
                maxSize={5 * 1024 * 1024}
                name='coverImage'
              />
              <Files
                accept='image/*,application/pdf'
                data-testid='edit-attachments'
                helpText='Optional supporting files.'
                maxSize={10 * 1024 * 1024}
                name='attachments'
              />
              <Arr
                data-testid='edit-tags'
                helpText='Press Enter to add each tag.'
                name='tags'
                placeholder='Add tag...'
                transform={s => s.toLowerCase()}
              />
            </FieldGroup>
            <AutoSaveIndicator className='ml-auto block' data-testid='auto-save-indicator' lastSaved={form.lastSaved} />
          </>
        )}
      />
    )
  },
  Setting = ({ blog }: { blog: Blog }) => {
    const update = useMutation(useReducer, reducers.updateBlog, {
        getName: () => 'blog.update.settings',
        toast: { error: 'Failed to save settings', success: 'Saved' }
      }),
      form = useForm({
        onSubmit: async d => {
          await update({
            attachments: undefined,
            category: d.category,
            content: undefined,
            coverImage: undefined,
            expectedUpdatedAt: undefined,
            id: blog.id,
            published: d.published,
            tags: undefined,
            title: undefined
          })
          return d
        },
        schema: editBlog,
        values: { category: blog.category, published: blog.published }
      })
    return (
      <Form
        className='flex flex-col gap-4'
        form={form}
        render={({ Choose, Submit, Toggle }) => (
          <>
            <FieldGroup className='gap-5'>
              <Choose helpText='Choose how this post is categorized.' name='category' required />
              <Toggle
                falseLabel='Draft'
                helpText='Publish when ready to make it visible.'
                name='published'
                trueLabel='Published'
              />
            </FieldGroup>
            <Submit>Save</Submit>
          </>
        )}
      />
    )
  },
  Client = ({ blog }: { blog: Blog | null }) => {
    const { identity } = useSpacetimeDB(),
      // eslint-disable-next-line no-restricted-properties
      isPlaywrightTest = process.env.NEXT_PUBLIC_PLAYWRIGHT === '1'
    if (!(blog && (isPlaywrightTest || (identity && blog.userId.isEqual(identity)))))
      return (
        <p className='text-muted-foreground' data-testid='blog-not-found'>
          Blog not found
        </p>
      )
    return (
      <div data-testid='edit-blog-page'>
        <div className='mb-3 flex justify-between'>
          <Link className='rounded-lg px-3 py-2 hover:bg-muted' data-testid='back-link' href={`/${blog.id}`}>
            &larr; Back
          </Link>
          <Popover>
            <PopoverTrigger asChild>
              <Settings
                className='size-8 rounded-lg stroke-1 p-1.5 group-hover:block hover:bg-muted'
                data-testid='settings-trigger'
              />
            </PopoverTrigger>
            <PopoverContent data-testid='settings-popover'>
              <Setting blog={blog} key={blog.id} />
            </PopoverContent>
          </Popover>
        </div>
        <Edit blog={blog} key={blog.id} />
      </div>
    )
  }

export { Client, Publish }
