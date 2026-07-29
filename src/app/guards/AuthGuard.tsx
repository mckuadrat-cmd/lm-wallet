import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

interface AuthGuardProps {
  children: React.ReactNode
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-700 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-xl font-medium text-text-muted">Loading session...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
