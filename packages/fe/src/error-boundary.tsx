'use client'

import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

const ErrorBoundary = async ({ children }: ErrorBoundaryProps) => children

export default ErrorBoundary
