// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

// -------------------------------------------------------
// Types
// -------------------------------------------------------
export type UserRole = 'super_admin' | 'owner' | 'manager' | 'cashier'

export interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  logo_url?: string
  currency: string
  timezone: string
  plan: 'free' | 'basic' | 'pro'
  is_active: boolean
}

export interface Profile {
  id: string
  tenant_id: string
  full_name: string
  email: string
  role: UserRole
  avatar_url?: string
  is_active: boolean
}

export interface AuthUser {
  profile: Profile
  tenant: Tenant
}
