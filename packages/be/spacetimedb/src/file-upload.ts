import { t } from 'spacetimedb/server'

import { fileUpload } from './lazy'

const fileCrud = fileUpload('file', 'file', {
  contentType: t.string(),
  filename: t.string(),
  size: t.number(),
  storageKey: t.string()
})

export { fileCrud }
