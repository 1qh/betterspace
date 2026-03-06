import { setupCrud } from 'betterspace/server'
import { t } from 'spacetimedb/server'

import { org as orgFields } from '../../t'
import spacetimedb from './tables'

const { allExports, cacheCrud, childCrud, crud, exports, fileUpload, m, org, orgCrud, register, singletonCrud } =
    setupCrud(spacetimedb, {
      expectedUpdatedAtField: t.timestamp(),
      foreignKeyField: t.u32(),
      idField: t.u32(),
      orgIdField: t.u32(),
      t
    }),
  orgFns = org(orgFields.team, {
    cascadeTables: ['task', 'project', 'wiki'],
    t
  })

export { allExports, cacheCrud, childCrud, crud, exports, fileUpload, m, org, orgCrud, orgFns, register, singletonCrud }
