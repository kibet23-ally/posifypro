import { createFileRoute, redirect } from '@tanstack/react-router'
import AdminDashboard from '@/pages/AdminDashboard'
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

    if (!profile) {
      throw redirect({ to: '/login' })
    }

    if (profile.role === 'super_admin') {
      throw redirect({ to: '/super-admin' })
    }

    if (profile.role !== 'admin') {
      throw redirect({ to: '/dashboard' })
    }
  },

  component: AdminDashboard,
})