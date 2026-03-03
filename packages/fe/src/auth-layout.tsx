import '@a/ui/globals.css'
import type { ReactNode } from 'react'

import { Toaster } from '@a/ui/sonner'
import { OfflineIndicator } from 'betterspace/components'
import { ThemeProvider } from 'next-themes'
import { Suspense } from 'react'

import ErrorBoundary from './error-boundary'

interface AuthLayoutProps {
  children: ReactNode
  provider: (children: ReactNode) => ReactNode
}

const AuthLayout = ({ children, provider }: AuthLayoutProps) => (
  <html lang='en' suppressHydrationWarning>
    <body className='min-h-screen bg-background font-sans tracking-tight text-foreground antialiased'>
      <Suspense>
        <ErrorBoundary>
          {provider(
            <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
              {children}
              <OfflineIndicator />
            </ThemeProvider>
          )}
          <Toaster duration={1000} />
        </ErrorBoundary>
      </Suspense>
    </body>
  </html>
)

export default AuthLayout
