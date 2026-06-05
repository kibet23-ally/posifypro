// src/components/ProtectedRoute.tsx
import { Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: ProtectedRouteProps) {
  const { session, profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session || !profile) return <Navigate to={redirectTo} />

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" />
  }

  if (!profile.org_id && profile.role !== 'super_admin') {
    return <Navigate to="/onboarding" />
  }

  return <>{children}</>
}
