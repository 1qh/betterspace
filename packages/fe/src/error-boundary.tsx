'use client'

import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

// eslint-disable-next-line @typescript-eslint/promise-function-async
const ErrorBoundary = ({ children }: ErrorBoundaryProps) => children

export default ErrorBoundary
