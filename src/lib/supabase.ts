// src/lib/supabase.ts
// Re-export the shared Supabase client + domain types matching the actual schema.
export { supabase } from '@/integrations/supabase/client'

export type UserRole = 'super_admin' | 'owner' | 'manager' | 'cashier'

export interface Organization {
  id: string
  name: string
  owner_id: string
  license_status: 'trial' | 'active' | 'lifetime' | 'expired' | string
  license_expires_at: string | null
  purchased_at: string | null
}

// Back-compat alias for files still importing { Tenant }
export type Tenant = Organization

export interface Profile {
  id: string
  org_id: string | null
  name: string | null
  email: string | null
  role: UserRole
  avatar: string | null
  is_active: boolean
}

export interface AuthUser {
  profile: Profile
  org: Organization
}
