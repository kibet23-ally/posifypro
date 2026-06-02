// src/pages/SuperAdminDashboard.tsx
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface Tenant {
  id: string
  name: string
  slug: string
  email: string
  phone?: string
  plan: 'free' | 'basic' | 'pro'
  is_active: boolean
  created_at: string
  staff_count?: number
  order_count?: number
  total_revenue?: number
}

interface Stats {
  totalTenants: number
  activeTenants: number
  totalRevenue: number
  totalOrders: number
}

const PLAN_COLORS = {
  free: '#6b7280',
  basic: '#3b82f6',
  pro: '#8b5cf6',
}

// -------------------------------------------------------
// Components
// -------------------------------------------------------
function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: string; color: string
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flex: 1, minWidth: '140px',
    }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
      <div style={{ fontSize: '22px', fontWeight: '800', color }}>{value}</div>
      <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function PlanBadge({ plan }: { plan: 'free' | 'basic' | 'pro' }) {
  return (
    <span style={{
      background: `${PLAN_COLORS[plan]}18`,
      color: PLAN_COLORS[plan],
      padding: '3px 10px', borderRadius: '99px',
      fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
    }}>
      {plan}
    </span>
  )
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------
export default function SuperAdminDashboard() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [stats, setStats] = useState<Stats>({ totalTenants: 0, activeTenants: 0, totalRevenue: 0, totalOrders: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'basic' | 'pro'>('all')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'tenants' | 'overview'>('overview')

  // Guard: only super admin
  useEffect(() => {
    if (profile && profile.role !== 'super_admin') {
      navigate({ to: '/app/dashboard' })
    }
  }, [profile])

  // Fetch all tenants with stats
  const fetchData = async () => {
    setIsLoading(true)
    try {
      const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false })

      if (!tenantsData) return

      // Enrich each tenant with counts
      const enriched = await Promise.all(
        tenantsData.map(async (t) => {
          const [staffRes, orderRes] = await Promise.all([
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id),
            supabase.from('orders').select('total_amount').eq('tenant_id', t.id).eq('status', 'completed'),
          ])
          const revenue = (orderRes.data ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
          return {
            ...t,
            staff_count: staffRes.count ?? 0,
            order_count: orderRes.data?.length ?? 0,
            total_revenue: revenue,
          }
        })
      )

      setTenants(enriched)
      setStats({
        totalTenants: enriched.length,
        activeTenants: enriched.filter(t => t.is_active).length,
        totalRevenue: enriched.reduce((s, t) => s + (t.total_revenue ?? 0), 0),
        totalOrders: enriched.reduce((s, t) => s + (t.order_count ?? 0), 0),
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // Toggle tenant active/inactive
  const toggleTenantStatus = async (tenant: Tenant) => {
    setActionLoading(true)
    const { error } = await supabase
      .from('tenants')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id)
    if (!error) {
      await fetchData()
      setSelectedTenant(null)
    }
    setActionLoading(false)
  }

  // Change tenant plan
  const changePlan = async (tenantId: string, plan: 'free' | 'basic' | 'pro') => {
    setActionLoading(true)
    await supabase.from('tenants').update({ plan }).eq('id', tenantId)
    await supabase.from('subscriptions').update({ plan }).eq('tenant_id', tenantId)
    await fetchData()
    setSelectedTenant(prev => prev ? { ...prev, plan } : null)
    setActionLoading(false)
  }

  // Filter tenants
  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
    const matchPlan = filterPlan === 'all' || t.plan === filterPlan
    return matchSearch && matchPlan
  })

  const fmt = (n: number) => `KES ${n.toLocaleString()}`

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div style={{
      minHeight: '100vh', background: '#f8f9fb',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #e5e7eb',
        padding: '0 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: '60px',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: '#6366f1', color: '#fff', borderRadius: '8px',
            padding: '6px 12px', fontWeight: '800', fontSize: '14px',
          }}>🏪 PosifyPro</span>
          <span style={{
            background: '#fef3c7', color: '#d97706', borderRadius: '99px',
            padding: '2px 10px', fontSize: '11px', fontWeight: '700',
          }}>SUPER ADMIN</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>
            {profile?.email}
          </span>
          <button onClick={signOut} style={{
            background: '#fee2e2', color: '#dc2626', border: 'none',
            borderRadius: '8px', padding: '6px 14px', fontSize: '13px',
            fontWeight: '600', cursor: 'pointer',
          }}>
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#e5e7eb', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {(['overview', 'tenants'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              fontWeight: '600', fontSize: '13px', cursor: 'pointer',
              background: activeTab === tab ? '#fff' : 'transparent',
              color: activeTab === tab ? '#111827' : '#6b7280',
              boxShadow: activeTab === tab ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
              {tab === 'overview' ? '📊 Overview' : '🏢 Tenants'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            <h2 style={{ margin: '0 0 20px', fontWeight: '800', fontSize: '20px', color: '#111827' }}>
              Platform Overview
            </h2>

            {/* Stat Cards */}
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px' }}>
              <StatCard label="Total Businesses" value={stats.totalTenants} icon="🏢" color="#6366f1" />
              <StatCard label="Active Businesses" value={stats.activeTenants} icon="✅" color="#10b981" />
              <StatCard label="Total Orders" value={stats.totalOrders} icon="🧾" color="#f59e0b" />
              <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} icon="💰" color="#3b82f6" />
            </div>

            {/* Plan breakdown */}
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '700', color: '#111827' }}>
                Plan Distribution
              </h3>
              {(['free', 'basic', 'pro'] as const).map(plan => {
                const count = tenants.filter(t => t.plan === plan).length
                const pct = tenants.length ? Math.round((count / tenants.length) * 100) : 0
                return (
                  <div key={plan} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: PLAN_COLORS[plan], textTransform: 'capitalize' }}>{plan}</span>
                      <span style={{ fontSize: '13px', color: '#6b7280' }}>{count} businesses ({pct}%)</span>
                    </div>
                    <div style={{ background: '#f3f4f6', borderRadius: '99px', height: '8px' }}>
                      <div style={{ width: `${pct}%`, background: PLAN_COLORS[plan], borderRadius: '99px', height: '8px', transition: 'width 0.5s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '20px', color: '#111827' }}>
                All Businesses ({filtered.length})
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  placeholder="Search businesses..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
                    fontSize: '13px', outline: 'none', width: '180px',
                  }}
                />
                <select
                  value={filterPlan}
                  onChange={e => setFilterPlan(e.target.value as any)}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e5e7eb',
                    fontSize: '13px', outline: 'none', background: '#fff',
                  }}
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                </select>
              </div>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                Loading businesses...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                No businesses found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filtered.map(tenant => (
                  <div key={tenant.id}
                    onClick={() => setSelectedTenant(tenant)}
                    style={{
                      background: '#fff', borderRadius: '12px', padding: '16px 20px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer',
                      border: selectedTenant?.id === tenant.id ? '2px solid #6366f1' : '2px solid transparent',
                      transition: 'all 0.2s',
                      opacity: tenant.is_active ? 1 : 0.6,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>{tenant.name}</span>
                          <PlanBadge plan={tenant.plan} />
                          {!tenant.is_active && (
                            <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '99px', fontSize: '10px', fontWeight: '700' }}>
                              SUSPENDED
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {tenant.email} · Joined {new Date(tenant.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                        <span>👥 {tenant.staff_count} staff</span>
                        <span>🧾 {tenant.order_count} orders</span>
                        <span>💰 {fmt(tenant.total_revenue ?? 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tenant Detail Panel */}
        {selectedTenant && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: '#fff', borderTop: '1px solid #e5e7eb',
            padding: '20px 24px', zIndex: 20,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.1)',
          }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: '800', fontSize: '16px' }}>{selectedTenant.name}</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>{selectedTenant.email}</p>
                </div>
                <button onClick={() => setSelectedTenant(null)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#6b7280' }}>
                  ✕
                </button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {/* Change plan */}
                {(['free', 'basic', 'pro'] as const).map(plan => (
                  <button key={plan}
                    onClick={() => changePlan(selectedTenant.id, plan)}
                    disabled={actionLoading || selectedTenant.plan === plan}
                    style={{
                      padding: '8px 16px', borderRadius: '8px', border: 'none',
                      fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                      background: selectedTenant.plan === plan ? PLAN_COLORS[plan] : `${PLAN_COLORS[plan]}18`,
                      color: selectedTenant.plan === plan ? '#fff' : PLAN_COLORS[plan],
                      opacity: actionLoading ? 0.6 : 1,
                      textTransform: 'capitalize',
                    }}>
                    {selectedTenant.plan === plan ? `✓ ${plan}` : `Upgrade to ${plan}`}
                  </button>
                ))}

                {/* Suspend / Activate */}
                <button
                  onClick={() => toggleTenantStatus(selectedTenant)}
                  disabled={actionLoading}
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: 'none',
                    fontWeight: '600', fontSize: '13px', cursor: 'pointer',
                    background: selectedTenant.is_active ? '#fee2e2' : '#dcfce7',
                    color: selectedTenant.is_active ? '#dc2626' : '#16a34a',
                    opacity: actionLoading ? 0.6 : 1,
                    marginLeft: 'auto',
                  }}>
                  {selectedTenant.is_active ? '🚫 Suspend Business' : '✅ Activate Business'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
