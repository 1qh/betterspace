'use client'

import { reducers, tables } from '@a/be/spacetimedb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { defineSteps } from 'betterspace/components'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'
import { toast } from 'sonner'

import { appearanceStep, orgStep, preferencesStep, profileStep } from '~/schema'

const { StepForm, useStepper } = defineSteps(
    { id: 'profile', label: 'Profile', schema: profileStep },
    { id: 'org', label: 'Organization', schema: orgStep },
    { id: 'appearance', label: 'Appearance', schema: appearanceStep },
    { id: 'preferences', label: 'Preferences', schema: preferencesStep }
  ),
  themeOptions = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' }
  ],
  OnboardingPage = () => {
    const { identity } = useSpacetimeDB(),
      [profiles] = useTable(tables.orgProfile),
      profile = identity ? profiles.find(p => p.userId.toHexString() === identity.toHexString()) : null,
      initialValues = {
        preferences: {
          notifications: profile?.notifications ?? false,
          theme: profile?.theme ?? 'system'
        },
        profile: {
          avatar: profile?.avatar ?? null,
          bio: profile?.bio,
          displayName: profile?.displayName
        }
      },
      upsert = useReducer(reducers.upsertOrgProfile),
      create = useReducer(reducers.orgCreate),
      stepper = useStepper({
        onSubmit: async d => {
          await upsert({ ...d.profile, ...d.preferences })
          await create({
            avatarId: d.appearance.orgAvatar,
            name: d.org.name,
            slug: d.org.slug
          })
        },
        onSuccess: () => {
          toast.success('Welcome aboard!')
          window.location.href = '/dashboard'
        },
        values: initialValues
      })

    return (
      <div className='container flex justify-center py-8'>
        <Card className='w-full max-w-2xl'>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Set up your account in a few steps</CardDescription>
          </CardHeader>
          <CardContent>
            <StepForm
              key={`${initialValues.profile.displayName ?? ''}:${initialValues.preferences.theme}:${initialValues.preferences.notifications}`}
              stepper={stepper}
              submitLabel='Complete'>
              <StepForm.Step
                id='profile'
                render={({ File, Text }) => (
                  <FieldGroup>
                    <Text name='displayName' />
                    <Text multiline name='bio' />
                    <File accept='image/*' name='avatar' />
                  </FieldGroup>
                )}
              />
              <StepForm.Step
                id='org'
                render={({ Text }) => (
                  <FieldGroup>
                    <Text name='name' />
                    <Text label='URL Slug' name='slug' />
                  </FieldGroup>
                )}
              />
              <StepForm.Step
                id='appearance'
                render={({ File }) => (
                  <FieldGroup>
                    <File accept='image/*' label='Organization Avatar' name='orgAvatar' />
                  </FieldGroup>
                )}
              />
              <StepForm.Step
                id='preferences'
                render={({ Choose, Toggle }) => (
                  <FieldGroup>
                    <Choose name='theme' options={themeOptions} />
                    <Toggle falseLabel='Off' name='notifications' trueLabel='On' />
                  </FieldGroup>
                )}
              />
            </StepForm>
          </CardContent>
        </Card>
      </div>
    )
  }

export default OnboardingPage
