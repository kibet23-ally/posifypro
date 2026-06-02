// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, type AuthUser, type Profile, type Tenant } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

// -------------------------------------------------------
// Context Types
// -------------------------------------------------------
interface AuthContextType {
  session: Session | null
  authUser: AuthUser | null
  profile: Profile | null
  tenant: Tenant | null
  isLoading: boolean
  isOwner: boolean
  isManager: boolean
  isCashier: boolean
  isSuperAdmin: boolean
  canManageStaff: boolean
  canManageProducts: boolean
  canViewReports: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// -------------------------------------------------------
// Auth Provider
// -------------------------------------------------------
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfileAndTenant = async (userId: string) => {
    // Fetch user profile
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profileError || !profileData) {
      setProfile(null)
      setTenant(null)
      return
    }

    setProfile(profileData)

    // Fetch tenant
    if (profileData.tenant_id) {
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', profileData.tenant_id)
        .single()

      setTenant(tenantData ?? null)
    }
  }

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfileAndTenant(session.user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfileAndTenant(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfileAndTenant(session.user.id)
        } else {
          setProfile(null)
          setTenant(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setTenant(null)
  }

  // -------------------------------------------------------
  // Role helpers — use these throughout the app
  // -------------------------------------------------------
  const role = profile?.role
  const isSuperAdmin = role === 'super_admin'
  const isOwner = role === 'owner'
  const isManager = role === 'manager'
  const isCashier = role === 'cashier'

  // Permission groups
  const canManageStaff = isSuperAdmin || isOwner
  const canManageProducts = isSuperAdmin || isOwner || isManager
  const canViewReports = isSuperAdmin || isOwner || isManager

  const authUser: AuthUser | null =
    profile && tenant ? { profile, tenant } : null

  return (
    <AuthContext.Provider value={{
      session,
      authUser,
      profile,
      tenant,
      isLoading,
      isOwner,
      isManager,
      isCashier,
      isSuperAdmin,
      canManageStaff,
      canManageProducts,
      canViewReports,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// -------------------------------------------------------
// Hook
// -------------------------------------------------------
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
