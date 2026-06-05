// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, type AuthUser, type Profile, type Organization } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'

interface AuthContextType {
  session: Session | null
  authUser: AuthUser | null
  profile: Profile | null
  org: Organization | null
  /** @deprecated use `org` */
  tenant: Organization | null
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfileAndOrg = async (userId: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (!profileData) {
      setProfile(null)
      setOrg(null)
      return
    }
    setProfile(profileData as unknown as Profile)

    if (profileData.org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profileData.org_id)
        .maybeSingle()
      setOrg((orgData as unknown as Organization) ?? null)
    } else {
      setOrg(null)
    }
  }

  const refreshProfile = async () => {
    if (session?.user?.id) await fetchProfileAndOrg(session.user.id)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfileAndOrg(session.user.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfileAndOrg(session.user.id)
        } else {
          setProfile(null)
          setOrg(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setOrg(null)
  }

  const role = profile?.role
  const isSuperAdmin = role === 'super_admin'
  const isOwner = role === 'owner'
  const isManager = role === 'manager'
  const isCashier = role === 'cashier'

  const canManageStaff = isSuperAdmin || isOwner
  const canManageProducts = isSuperAdmin || isOwner || isManager
  const canViewReports = isSuperAdmin || isOwner || isManager

  const authUser: AuthUser | null = profile && org ? { profile, org } : null

  return (
    <AuthContext.Provider value={{
      session, authUser, profile, org, tenant: org, isLoading,
      isOwner, isManager, isCashier, isSuperAdmin,
      canManageStaff, canManageProducts, canViewReports,
      signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
