/* oxlint-disable promise/prefer-await-to-then, promise/always-return */

'use client'

import type { Project, Task } from '@a/be/spacetimedb/types'

import { reducers, tables } from '@a/be/spacetimedb'
import { orgScoped } from '@a/be/z'
import { fail, sameIdentity } from '@a/fe/utils'
import { Button } from '@a/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@a/ui/card'
import { FieldGroup } from '@a/ui/field'
import { Skeleton } from '@a/ui/skeleton'
import { Form, PermissionGuard, useForm } from 'betterspace/components'
import { pickValues } from 'betterspace/zod'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { toast } from 'sonner'
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react'

import { useOrg } from '~/hook/use-org'

const EditProjectForm = ({ projectId, taskCount }: { projectId: number; taskCount: number }) => {
    const router = useRouter(),
      { org } = useOrg(),
      [projects] = useTable(tables.project),
      project = projects.find((p: Project) => p.id === projectId && p.orgId === Number(org._id)),
      remove = useReducer(reducers.rmProject),
      update = useReducer(reducers.updateProject),
      form = useForm({
        onSubmit: async d => {
          await update({
            description: d.description,
            editors: undefined,
            expectedUpdatedAt: project?.updatedAt,
            id: projectId,
            name: d.name,
            status: d.status
          })
          toast.success('Project updated')
          router.push(`/projects/${projectId}`)
          return d
        },
        resetOnSuccess: true,
        schema: orgScoped.project,
        values: project ? pickValues(orgScoped.project, project) : undefined
      }),
      handleDelete = () => {
        if (taskCount < 0) return
        remove({ id: projectId })
          .then(() => {
            toast.success('Project deleted')
            router.push('/projects')
          })
          .catch(fail)
      }

    if (!project) return <Skeleton className='h-40' />

    return (
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
            <div className='flex gap-2'>
              <Submit className='flex-1'>Save changes</Submit>
              <Button onClick={handleDelete} type='button' variant='destructive'>
                Delete
              </Button>
            </div>
          </>
        )}
      />
    )
  },
  EditProjectPage = ({ params }: { params: Promise<{ projectId: string }> }) => {
    const { projectId } = use(params),
      pid = Number(projectId),
      { isAdmin, org } = useOrg(),
      { identity } = useSpacetimeDB(),
      [projects] = useTable(tables.project),
      [tasks] = useTable(tables.task),
      project = projects.find((p: Project) => p.id === pid && p.orgId === Number(org._id)),
      projectTasks = tasks.filter((t: Task) => t.projectId === pid && t.orgId === Number(org._id))

    if (!(project && identity)) return <Skeleton className='h-40' />

    const canEditProject =
      isAdmin ||
      sameIdentity(project.userId, identity) ||
      (project.editors ?? []).some(editor => sameIdentity(editor, identity))

    return (
      <PermissionGuard
        backHref={`/projects/${projectId}`}
        backLabel='project'
        canAccess={canEditProject}
        resource='project'>
        <div className='flex justify-center'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <CardTitle>Edit project</CardTitle>
            </CardHeader>
            <CardContent>
              <EditProjectForm projectId={pid} taskCount={projectTasks.length} />
            </CardContent>
          </Card>
        </div>
      </PermissionGuard>
    )
  }

export default EditProjectPage
