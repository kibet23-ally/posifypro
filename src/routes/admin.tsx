// src/routes/admin.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import SuperAdminDashboard from '@/pages/SuperAdminDashboard'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw redirect({ to: '/login' })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      throw redirect({ to: '/app/dashboard' })
    }
  },
  component: SuperAdminDashboard,
})
