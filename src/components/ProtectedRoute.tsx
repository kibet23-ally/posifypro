// src/components/ProtectedRoute.tsx
// Wrap any route/page with this to enforce auth + role access
import { Navigate } from '@tanstack/react-router'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/lib/supabase'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]   // if empty, any logged-in user can access
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

  // Not logged in
  if (!session || !profile) {
    return <Navigate to={redirectTo} />
  }

  // Logged in but wrong role
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to="/unauthorized" />
  }

  // Tenant not set up yet (owner just signed up, no tenant linked)
  if (!profile.tenant_id && profile.role !== 'super_admin') {
    return <Navigate to="/onboarding" />
  }

  return <>{children}</>
}

// -------------------------------------------------------
// Usage examples:
//
// Any logged-in user:
// <ProtectedRoute><Dashboard /></ProtectedRoute>
//
// Owners and managers only:
// <ProtectedRoute allowedRoles={['owner', 'manager']}><Reports /></ProtectedRoute>
//
// Super admin only:
// <ProtectedRoute allowedRoles={['super_admin']}><AdminPanel /></ProtectedRoute>
// -------------------------------------------------------
