import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import AuthLayout from '@a/fe/auth-layout'
import SpacetimeProvider from '@a/fe/spacetimedb-provider'
import { SidebarInset, SidebarProvider } from '@a/ui/sidebar'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

import Sidebar from './sidebar'

const metadata: Metadata = { description: 'betterspace chat demo', title: 'Chat' },
  PUBLIC_PATHS = ['/login', '/public'],
  isPublicPath = (pathname: string) => {
    for (const p of PUBLIC_PATHS) if (pathname === p || pathname.startsWith(`${p}/`)) return true
    return false
  },
  Layout = async ({ children }: { children: ReactNode }) => {
    const pathname = (await headers()).get('x-pathname') ?? '/',
      token = (await cookies()).get('spacetimedb_token')?.value,
      // eslint-disable-next-line no-restricted-properties
      isPlaywright = process.env.PLAYWRIGHT === '1' || process.env.NEXT_PUBLIC_PLAYWRIGHT === '1'

    if (!(isPublicPath(pathname) || isPlaywright || (typeof token === 'string' && token.length > 0))) redirect('/login')

    const showSidebar = !isPublicPath(pathname)

    return (
      <AuthLayout provider={inner => <SpacetimeProvider>{inner}</SpacetimeProvider>}>
        {showSidebar ? (
          <SidebarProvider>
            <Sidebar />
            <SidebarInset className='flex h-screen flex-col'>{children}</SidebarInset>
          </SidebarProvider>
        ) : (
          children
        )}
      </AuthLayout>
    )
  }

export { metadata }
export default Layout
