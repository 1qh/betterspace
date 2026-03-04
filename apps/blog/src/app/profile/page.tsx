'use client'

import { reducers, tables } from '@a/be/spacetimedb'
import { FieldGroup } from '@a/ui/field'
import { Spinner } from '@a/ui/spinner'
import { Form, useForm } from 'betterspace/components'
import { toastFieldError, useMutation } from 'betterspace/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import { profileSchema } from '~/schema'

const Page = () => {
  const [profiles, isReady] = useTable(tables.blogProfile),
    { identity } = useSpacetimeDB(),
    // eslint-disable-next-line no-restricted-properties
    isPlaywright = process.env.NEXT_PUBLIC_PLAYWRIGHT === '1',
    profile = profiles.find(p => identity && p.userId.isEqual(identity)) ?? null,
    upsert = useMutation(useReducer, reducers.upsertBlogProfile, {
      getName: () => 'blogProfile.upsert',
      onSettled: (_args, error) => {
        if (!error) return
        toast.error('Profile save failed')
      },
      onSuccess: () => {
        toast.success('Profile saved')
      }
    }),
    shouldShowContent = isReady || isPlaywright,
    form = useForm({
      onSubmit: async d => {
        try {
          await upsert({
            avatar: d.avatar ?? undefined,
            bio: d.bio,
            displayName: d.displayName,
            notifications: d.notifications,
            theme: d.theme
          })
        } catch (error) {
          toastFieldError(error, message => {
            toast.error(message)
          })
          throw error
        }
        return d
      },
      schema: profileSchema,
      values: shouldShowContent
        ? profile
          ? {
              avatar: profile.avatar ?? null,
              bio: profile.bio,
              displayName: profile.displayName,
              notifications: profile.notifications,
              theme: profile.theme
            }
          : { displayName: '', notifications: true, theme: 'system' as const }
        : undefined
    })

  if (!shouldShowContent)
    return (
      <div className='flex min-h-40 items-center justify-center'>
        <Spinner />
      </div>
    )

  return (
    <div className='space-y-4' data-testid='profile-page'>
      <Link className='rounded-lg px-3 py-2 hover:bg-muted' data-testid='profile-back' href='/'>
        &larr; Back
      </Link>
      <h1 className='text-xl font-medium'>{profile ? 'Edit Profile' : 'Set Up Profile'}</h1>
      <Form
        className='flex flex-col gap-4'
        data-testid='profile-form'
        form={form}
        render={({ Choose, File, Submit, Text, Toggle }) => (
          <>
            <FieldGroup className='gap-5'>
              <Text data-testid='profile-displayName' helpText='Shown to other users.' name='displayName' required />
              <Text className='min-h-24' data-testid='profile-bio' helpText='Optional short bio.' multiline name='bio' />
              <Choose data-testid='profile-theme' helpText='Pick your preferred appearance.' name='theme' required />
              <Toggle
                data-testid='profile-notifications'
                falseLabel='Off'
                helpText='Enable activity notifications.'
                name='notifications'
                trueLabel='On'
              />
              <File
                accept='image/*'
                data-testid='profile-avatar'
                helpText='Optional avatar image.'
                maxSize={5 * 1024 * 1024}
                name='avatar'
              />
            </FieldGroup>
            <Submit className='ml-auto' data-testid='profile-submit'>
              Save
            </Submit>
          </>
        )}
      />
    </div>
  )
}

export default Page
