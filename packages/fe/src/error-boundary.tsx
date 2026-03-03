'use client'

import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

/** biome-ignore lint/correctness/noNextAsyncClientComponent: stub passthrough component */
const ErrorBoundary = async ({ children }: ErrorBoundaryProps) => children

export default ErrorBoundary
