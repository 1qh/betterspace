# Forms

## zodFromTable

`zodFromTable` converts a SpacetimeDB table's column definitions into a Zod schema. This lets you derive form validation schemas directly from your database schema, keeping them in sync automatically.

```typescript
import { zodFromTable } from 'betterspace'
import { tables } from '@/generated/module_bindings'

// Generate a Zod schema from the post table
const postSchema = zodFromTable(tables.post.columns)
// Automatically excludes: id (autoInc), userId (identity), updatedAt (timestamp)
// Includes: title (string), content (string), published (bool)
```

### Options

```typescript
zodFromTable(columns, {
  // Only include these fields
  include: ['title', 'content'],

  // Exclude specific fields (in addition to auto-excluded ones)
  exclude: ['published'],

  // Make these fields optional in the schema
  optional: ['content'],
})
```

Auto-excluded fields (unless explicitly included):
- `identity` columns (e.g., `userId`)
- `timestamp` columns (e.g., `updatedAt`)
- Auto-increment primary keys (e.g., `id`)

### Practical example

```typescript
// apps/blog/src/schema-client.ts
import { zodFromTable } from 'betterspace'
import { tables } from '@/generated/module_bindings'

// For creating a post: exclude published (defaults to false)
const createPostSchema = zodFromTable(tables.post.columns, {
  exclude: ['published'],
})

// For editing: all fields optional
const editPostSchema = zodFromTable(tables.post.columns).partial()

// For a profile form
const profileSchema = zodFromTable(tables.blogProfile.columns)

export { createPostSchema, editPostSchema, profileSchema }
```

## Integration with @tanstack/react-form

```bash
bun add @tanstack/react-form zod
```

```typescript
'use client'

import { useForm } from '@tanstack/react-form'
import { zodValidator } from '@tanstack/zod-form-adapter'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'
import { createPostSchema } from '@/schema-client'

const CreatePostForm = () => {
  const createPost = useReducer(reducers.create_post)

  const form = useForm({
    defaultValues: {
      title: '',
      content: '',
    },
    validatorAdapter: zodValidator(),
    validators: {
      onChange: createPostSchema,
    },
    onSubmit: async ({ value }) => {
      await createPost({
        ...value,
        published: false,
      })
      form.reset()
    },
  })

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field
        name="title"
        children={field => (
          <div>
            <label>Title</label>
            <input
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.map(err => (
              <span key={err}>{err}</span>
            ))}
          </div>
        )}
      />
      <form.Field
        name="content"
        children={field => (
          <div>
            <label>Content</label>
            <textarea
              value={field.state.value}
              onChange={e => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
          </div>
        )}
      />
      <button type="submit" disabled={form.state.isSubmitting}>
        {form.state.isSubmitting ? 'Creating...' : 'Create post'}
      </button>
    </form>
  )
}

export default CreatePostForm
```

## Error handling in forms

Reducer errors use the `SenderError('CODE: message')` convention. Parse them to show field-level errors:

```typescript
import { extractErrorData } from 'betterspace'

const form = useForm({
  onSubmit: async ({ value }) => {
    try {
      await createPost(value)
    } catch (error) {
      const data = extractErrorData(error)
      if (data?.code === 'CONFLICT') {
        form.setFieldMeta('title', meta => ({
          ...meta,
          errors: ['A post with this title already exists'],
        }))
      }
    }
  },
})
```

## File uploads

File uploads go through a Next.js API route that generates S3/MinIO pre-signed URLs. The `useUpload` hook handles the upload flow.

### API route

```typescript
// app/api/upload/presign/route.ts
import { createS3UploadPresignedUrl } from 'betterspace/server'
import { NextResponse } from 'next/server'

const S3_CONFIG = {
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  bucket: process.env.S3_BUCKET!,
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
}

export const POST = async (req: Request) => {
  const { filename, contentType, size } = await req.json() as {
    filename: string
    contentType: string
    size: number
  }

  const key = `uploads/${Date.now()}-${filename}`

  const presigned = await createS3UploadPresignedUrl({
    ...S3_CONFIG,
    key,
    contentType,
  })

  return NextResponse.json({
    uploadUrl: presigned.url,
    storageKey: key,
    headers: presigned.headers,
    method: 'PUT',
  })
}
```

### useUpload hook

```typescript
'use client'

import { useUpload } from 'betterspace/react'
import { useReducer } from 'spacetimedb/react'
import { reducers } from '@/generated/module_bindings'

const FileUploadForm = () => {
  const registerUpload = useReducer(reducers.register_upload_file)

  const { upload, isUploading, progress, error } = useUpload({
    apiEndpoint: '/api/upload/presign',
    registerFile: async ({ contentType, filename, size, storageKey }) => {
      await registerUpload({ contentType, filename, size, storageKey })
      return { storageId: storageKey }
    },
  })

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await upload(file)
    if (result.ok) {
      console.log('Uploaded:', result.storageId)
    } else {
      console.error('Upload failed:', result.code)
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileChange} disabled={isUploading} />
      {isUploading && <progress value={progress} max={100} />}
      {error && <span>Upload failed: {error}</span>}
    </div>
  )
}
```

### Upload flow

1. User selects a file
2. `useUpload` calls your API route (`/api/upload/presign`) with file metadata
3. API route generates a pre-signed S3/MinIO URL
4. `useUpload` uploads the file directly to S3/MinIO using the pre-signed URL
5. On success, `registerFile` is called to record the upload in SpacetimeDB via a reducer
6. The file row is now in the database and visible to subscribers

This pattern works in local dev (MinIO) and production (S3, R2, etc.) without changing client code.

## Form utilities from betterspace/react

```typescript
import { buildMeta, getMeta, useForm, useFormMutation } from 'betterspace/react'
```

These are lower-level utilities for building custom form integrations. For most cases, `@tanstack/react-form` with `zodFromTable` is the recommended approach.
