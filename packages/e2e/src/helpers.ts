/** biome-ignore-all lint/suspicious/noDocumentCookie: test cookie setup */
// biome-ignore-all lint/nursery/useGlobalThis: browser API
// oxlint-disable no-document-cookie
import type { Page } from '@playwright/test'

import { api, ensureTestUser, extractErrorCode, getTestToken, tc } from './org-helpers'

interface OrgMembershipLike {
  org: {
    _id: string
    slug: string
  }
}

// eslint-disable-next-line max-statements
const login = async (page: Page) => {
    await ensureTestUser()
    const token = await getTestToken(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      orgs = await tc.query<OrgMembershipLike[]>(api.org.myOrgs, {})
    let activeOrgId = '',
      activeOrgSlug = '',
      latestId = -1
    for (const item of orgs) {
      const id = Number.parseInt(item.org._id, 10)
      if (Number.isFinite(id) && id >= latestId) {
        latestId = id
        activeOrgId = item.org._id
        activeOrgSlug = item.org.slug
      }
    }
    const cookies = [{ name: 'spacetimedb_token', url: 'http://localhost:3004', value: token }]
    if (activeOrgId.length > 0) {
      cookies.push({ name: 'activeOrgId', url: 'http://localhost:3004', value: activeOrgId })
      cookies.push({ name: 'activeOrgSlug', url: 'http://localhost:3004', value: activeOrgSlug })
    }
    await page.context().addCookies(cookies)
    await page.addInitScript(
      value => {
        window.localStorage.setItem('spacetimedb.token', value.token)
        document.cookie = `spacetimedb_token=${encodeURIComponent(value.token)}; Path=/; SameSite=Lax`
        if (value.orgId.length > 0) {
          document.cookie = `activeOrgId=${encodeURIComponent(value.orgId)}; Path=/; SameSite=Lax`
          document.cookie = `activeOrgSlug=${encodeURIComponent(value.orgSlug)}; Path=/; SameSite=Lax`
        }
      },
      { orgId: activeOrgId, orgSlug: activeOrgSlug, token }
    )
  },
  cleanupTestData = async () => {
    await ensureTestUser()
    try {
      await tc.raw.mutation('reset_all_data', {})
    } catch (error) {
      const parsed = extractErrorCode(error)
      if (!(parsed?.code === 'NOT_IMPLEMENTED')) throw error
    }
  }

export { cleanupTestData, login }
