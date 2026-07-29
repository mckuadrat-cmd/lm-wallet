import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../providers/AuthProvider'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: ('admin' | 'banker')[]
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles }) => {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-700 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-xl font-medium text-text-muted">Verifying permissions...</p>
        </div>
      </div>
    )
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    if (profile?.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />
    } else if (profile?.role === 'banker') {
      return <Navigate to="/banker/dashboard" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
