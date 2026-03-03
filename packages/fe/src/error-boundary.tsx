'use client'

import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

/** biome-ignore lint/correctness/noNextAsyncClientComponent: biome --fix auto-adds async */
// oxlint-disable-next-line eslint-plugin-next/no-async-client-component
const ErrorBoundary = async ({ children }: ErrorBoundaryProps) => children

export default ErrorBoundary
