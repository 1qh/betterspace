import type { Page } from '@playwright/test'

import { ensureTestUser, extractErrorCode, getTestToken, tc } from './org-helpers'

const login = async (page: Page) => {
    await ensureTestUser()
    const token = await getTestToken()
    await page.addInitScript(value => {
      window.localStorage.setItem('spacetimedb.token', value)
      document.cookie = `spacetimedb_token=${encodeURIComponent(value)}; Path=/; SameSite=Lax`
    }, token)
  },
  cleanupTestData = async () => {
    await ensureTestUser()
    try {
      await tc.raw.mutation('reset_all_data', {})
    } catch (error) {
      const parsed = extractErrorCode(error)
      if (!(parsed && parsed.code === 'NOT_IMPLEMENTED')) throw error
    }
  }

export { cleanupTestData, login }
