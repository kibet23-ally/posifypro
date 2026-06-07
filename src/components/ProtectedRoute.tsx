// src/components/ProtectedRoute.tsx
import { Navigate } from '@tanstack/react-router'
import { useAuth } from '@/hooks/use-auth'
import { useOrg } from '@/hooks/use-org'
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
  const { session, role, loading } = useAuth()
  const { orgId, loading: orgLoading } = useOrg()

  if (loading || orgLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return <Navigate to={redirectTo} />

  if (allowedRoles && !allowedRoles.includes(role as UserRole)) {
    return <Navigate to="/unauthorized" />
  }

  if (!orgId && role !== 'super_admin') {
    return <Navigate to="/onboarding" />
  }

  return <>{children}</>
}
