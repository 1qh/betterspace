'use client'

import type { ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

const ErrorBoundary = ({ children }: ErrorBoundaryProps) => children

export default ErrorBoundary
