// src/lib/auth.ts
// All auth actions: signup, login, invite staff, accept invite
import { supabase } from './supabase'

// -------------------------------------------------------
// 1. OWNER SIGNUP
// New business registers on PosifyPro
// -------------------------------------------------------
export async function signUpAsOwner({
  email,
  password,
  fullName,
  businessName,
  phone,
  currency = 'KES',
}: {
  email: string
  password: string
  fullName: string
  businessName: string
  phone?: string
  currency?: string
}) {
  // Step 1: Create auth user with metadata
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: 'owner', // will be set after tenant is created
      },
    },
  })

  if (error) throw error
  if (!data.user) throw new Error('Signup failed')

  // Step 2: Create tenant + link owner (Supabase function)
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: result, error: fnError } = await supabase.rpc(
    'create_tenant_with_owner',
    {
      p_business_name: businessName,
      p_slug: slug,
      p_email: email,
      p_phone: phone ?? null,
      p_currency: currency,
      p_user_id: data.user.id,
    }
  )

  if (fnError) throw fnError

  return { user: data.user, tenant: result }
}

// -------------------------------------------------------
// 2. LOGIN
// -------------------------------------------------------
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

// -------------------------------------------------------
// 3. SIGN OUT
// -------------------------------------------------------
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// -------------------------------------------------------
// 4. INVITE STAFF MEMBER
// Owner or manager invites a cashier/manager to their store
// -------------------------------------------------------
export async function inviteStaff({
  email,
  role,
  tenantId,
  invitedBy,
}: {
  email: string
  role: 'manager' | 'cashier'
  tenantId: string
  invitedBy: string
}) {
  const { data, error } = await supabase
    .from('staff_invites')
    .insert({
      email,
      role,
      tenant_id: tenantId,
      invited_by: invitedBy,
    })
    .select('token, expires_at')
    .single()

  if (error) throw error

  // In production: send invite email with the token link
  // e.g. https://posifypro.vercel.app/accept-invite?token=XXX
  const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`

  return { token: data.token, inviteLink, expiresAt: data.expires_at }
}

// -------------------------------------------------------
// 5. ACCEPT STAFF INVITE
// New staff member signs up using their invite token
// -------------------------------------------------------
export async function signUpWithInvite({
  token,
  email,
  password,
  fullName,
}: {
  token: string
  email: string
  password: string
  fullName: string
}) {
  // Step 1: Create the auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  })

  if (error) throw error
  if (!data.user) throw new Error('Signup failed')

  // Step 2: Accept the invite (links user to tenant with role)
  const { data: result, error: fnError } = await supabase.rpc(
    'accept_staff_invite',
    {
      p_token: token,
      p_user_id: data.user.id,
    }
  )

  if (fnError) throw fnError
  if (!result.success) throw new Error(result.error)

  return { user: data.user, role: result.role }
}

// -------------------------------------------------------
// 6. REQUEST PASSWORD RESET
// -------------------------------------------------------
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}
