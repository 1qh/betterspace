'use client'

import { useSyncExternalStore } from 'react'

const subscribe = (onStoreChange: () => void) => {
    window.addEventListener('online', onStoreChange)
    window.addEventListener('offline', onStoreChange)
    return () => {
      window.removeEventListener('online', onStoreChange)
      window.removeEventListener('offline', onStoreChange)
    }
  },
  getSnapshot = () => navigator.onLine,
  getServerSnapshot = () => true,
  /** Returns whether the browser is currently online, reactively updating on connectivity changes. */
  useOnlineStatus = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

export default useOnlineStatus
