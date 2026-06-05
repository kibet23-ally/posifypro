// src/lib/auth.ts
// Auth actions. The `handle_new_user` trigger creates the organization,
// profile, and membership automatically on signup — no RPC needed.
import { supabase } from './supabase'

export async function signUpAsOwner({
  email,
  password,
  fullName,
  businessName,
}: {
  email: string
  password: string
  fullName: string
  businessName: string
  phone?: string
  currency?: string
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: fullName,
        business_name: businessName,
      },
    },
  })
  if (error) throw error
  if (!data.user) throw new Error('Signup failed')
  return { user: data.user }
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Staff invites are not implemented in the current schema.
export async function inviteStaff(_: {
  email: string
  role: 'manager' | 'cashier'
  orgId: string
  invitedBy: string
}): Promise<{ token: string; inviteLink: string; expiresAt: string }> {
  throw new Error('Staff invites are not yet available.')
}

export async function signUpWithInvite(_: {
  token: string
  email: string
  password: string
  fullName: string
}): Promise<{ user: any; role: string }> {
  throw new Error('Invite-based signup is not yet available.')
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}
