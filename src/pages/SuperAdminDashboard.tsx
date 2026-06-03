// src/pages/SuperAdminDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Building2, TrendingUp, Users, Crown,
  Shield, UserCheck, CheckCircle2, XCircle, LogOut, Zap,
  RefreshCw, Search, X, ChevronRight, Bell, Settings,
  AlertTriangle,
} from "lucide-react";


// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type AdminTab = "overview" | "tenants" | "analytics" | "staff" | "activity" | "settings";

interface Tenant {
  id: string; name: string; slug: string; email: string;
  phone?: string; plan: "free" | "basic" | "pro";
  is_active: boolean; created_at: string; currency: string;
  staff_count?: number; order_count?: number;
}

interface KPI {
  totalTenants: number; activeTenants: number; newThisMonth: number;
  suspendedTenants: number; totalStaff: number;
  proTenants: number; basicTenants: number; freeTenants: number;
  tenantGrowth: number;
}

interface RevenuePoint { month: string; tenants: number; }

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const PLAN_CFG = {
  free:  { color: "#94a3b8", bg: "#f1f5f9", label: "Free"  },
  basic: { color: "#3b82f6", bg: "#eff6ff", label: "Basic" },
  pro:   { color: "#8b5cf6", bg: "#f5f3ff", label: "Pro"   },
};
const PLAN_COLORS = ["#94a3b8", "#3b82f6", "#8b5cf6"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const SIDEBAR_ITEMS = [
  { id: "overview",   label: "Overview",    icon: LayoutDashboard },
  { id: "tenants",    label: "Businesses",  icon: Building2       },
  { id: "analytics",  label: "Analytics",   icon: TrendingUp      },
  { id: "staff",      label: "All Staff",   icon: Users           },
  { id: "activity",   label: "Activity",    icon: Bell            },
  { id: "settings",   label: "Settings",    icon: Settings        },
] as const;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n / 1_000).toFixed(1)}K`
  : String(n);

// ─────────────────────────────────────────────
// KPI Card
// ─────────────────────────────────────────────
function KPICard({ label, value, sub, icon: Icon, trend, color, loading }: {
  label: string; value: string; sub?: string;
  icon: any; trend?: number; color: string; loading?: boolean;
}) {
  const up = (trend ?? 0) >= 0;
  return (
    <div style={{
      background: "#fff", borderRadius: "14px", padding: "18px 20px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9",
      flex: 1, minWidth: "150px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ background: `${color}15`, borderRadius: "10px", padding: "8px" }}>
          <Icon style={{ width: "17px", height: "17px", color }} />
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: "11px", fontWeight: "700", padding: "2px 7px", borderRadius: "99px",
            background: up ? "#f0fdf4" : "#fef2f2", color: up ? "#16a34a" : "#dc2626",
          }}>
            {up ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ height: "28px", background: "#f1f5f9", borderRadius: "6px", marginBottom: "6px" }} />
      ) : (
        <div style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", letterSpacing: "-0.5px" }}>{value}</div>
      )}
      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px", fontWeight: "500" }}>{label}</div>
      {sub && <div style={{ fontSize: "11px", color: "#cbd5e1", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────
// Plan Badge
// ─────────────────────────────────────────────
function PlanBadge({ plan }: { plan: "free" | "basic" | "pro" }) {
  const cfg = PLAN_CFG[plan];
  return (
    <span style={{
      background: cfg.bg, color: cfg.color, padding: "2px 9px",
      borderRadius: "99px", fontSize: "10px", fontWeight: "700",
      textTransform: "uppercase", letterSpacing: "0.5px",
      border: `1px solid ${cfg.color}30`,
    }}>{cfg.label}</span>
  );
}

// ─────────────────────────────────────────────
// Custom Tooltip
// ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#0f172a", borderRadius: "8px", padding: "8px 12px",
      fontSize: "12px", color: "#fff",
    }}>
      <div style={{ color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontWeight: "700" }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [growthData, setGrowthData] = useState<RevenuePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState<"all"|"free"|"basic"|"pro">("all");
  const [filterStatus, setFilterStatus] = useState<"all"|"active"|"suspended">("all");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"newest"|"staff"|"orders">("newest");

  // Guard: super admin only
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single()
      .then(({ data }) => { if (data?.role !== "super_admin") navigate({ to: "/dashboard" }); });
  }, [user]);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      // Exclude the posifypro system tenant from the list
      const { data: tenantsRaw } = await supabase
        .from("tenants")
        .select("*")
        .neq("slug", "posifypro")          // exclude system tenant
        .order("created_at", { ascending: false });

      if (!tenantsRaw) return;

      // Enrich with staff + order counts (NO revenue shown)
      const enriched: Tenant[] = await Promise.all(
        tenantsRaw.map(async t => {
          const [staffRes, orderRes] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          ]);
          return {
            ...t,
            staff_count: staffRes.count ?? 0,
            order_count: orderRes.count ?? 0,
          };
        })
      );
      setTenants(enriched);

      // All staff across all tenants (excluding super admin)
      const { data: staffData } = await supabase
        .from("profiles")
        .select("*, tenants(name)")
        .neq("role", "super_admin")
        .order("created_at", { ascending: false });
      setAllStaff(staffData ?? []);

      // KPIs
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const newThisMonth = enriched.filter(t => new Date(t.created_at) >= monthStart).length;
      const newLastMonth = enriched.filter(t => {
        const d = new Date(t.created_at);
        return d >= lastMonthStart && d < monthStart;
      }).length;

      setKpi({
        totalTenants: enriched.length,
        activeTenants: enriched.filter(t => t.is_active).length,
        suspendedTenants: enriched.filter(t => !t.is_active).length,
        newThisMonth,
        totalStaff: (staffData ?? []).length,
        proTenants: enriched.filter(t => t.plan === "pro").length,
        basicTenants: enriched.filter(t => t.plan === "basic").length,
        freeTenants: enriched.filter(t => t.plan === "free").length,
        tenantGrowth: newLastMonth > 0
          ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100)
          : newThisMonth > 0 ? 100 : 0,
      });

      // Growth chart: last 6 months
      const growth: RevenuePoint[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return {
          month: MONTHS[d.getMonth()],
          tenants: enriched.filter(t => new Date(t.created_at) <= mEnd).length,
        };
      });
      setGrowthData(growth);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Actions ──
  const toggleStatus = async (t: Tenant) => {
    setActionLoading(true);
    await supabase.from("tenants").update({ is_active: !t.is_active }).eq("id", t.id);
    await fetchData();
    setSelectedTenant(prev => prev ? { ...prev, is_active: !t.is_active } : null);
    setActionLoading(false);
  };

  const changePlan = async (t: Tenant, plan: "free"|"basic"|"pro") => {
    setActionLoading(true);
    await supabase.from("tenants").update({ plan }).eq("id", t.id);
    await supabase.from("subscriptions").update({ plan }).eq("tenant_id", t.id);
    await fetchData();
    setSelectedTenant(prev => prev ? { ...prev, plan } : null);
    setActionLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  // ── Filter ──
  const filtered = tenants
    .filter(t => {
      const q = search.toLowerCase();
      const ms = !q || t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q);
      const mp = filterPlan === "all" || t.plan === filterPlan;
      const mst = filterStatus === "all" || (filterStatus === "active" ? t.is_active : !t.is_active);
      return ms && mp && mst;
    })
    .sort((a, b) => {
      if (sortBy === "staff") return (b.staff_count ?? 0) - (a.staff_count ?? 0);
      if (sortBy === "orders") return (b.order_count ?? 0) - (a.order_count ?? 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const filteredStaff = allStaff.filter(s => {
    const q = staffSearch.toLowerCase();
    return !q || s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  const planDist = [
    { name: "Free",  value: kpi?.freeTenants  ?? 0 },
    { name: "Basic", value: kpi?.basicTenants ?? 0 },
    { name: "Pro",   value: kpi?.proTenants   ?? 0 },
  ];

  const ROLE_CFG: Record<string, { color: string; bg: string; icon: any }> = {
    owner:   { color: "#f59e0b", bg: "#fffbeb", icon: Crown     },
    manager: { color: "#3b82f6", bg: "#eff6ff", icon: Shield    },
    cashier: { color: "#10b981", bg: "#f0fdf4", icon: UserCheck },
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  const sidebarW = 240;
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40,
          }} />
        )}

        <aside style={{
          width: `${sidebarW}px`, background: "#0f172a", display: "flex",
          flexDirection: "column", flexShrink: 0, height: "100vh",
          ...(isMobile ? {
            position: "fixed" as any,
            left: sidebarOpen ? 0 : `-${sidebarW}px`,
            top: 0, zIndex: 50,
            transition: "left 0.25s ease",
          } : {
            position: "sticky" as any,
            top: 0,
          }),
        }}>
          {/* Logo */}
          <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
              <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "8px", padding: "6px 8px" }}>
                <Zap style={{ width: "15px", height: "15px", color: "#fff" }} />
              </div>
              <span style={{ color: "#fff", fontWeight: "800", fontSize: "15px", letterSpacing: "-0.3px" }}>PosifyPro</span>
            </div>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              background: "linear-gradient(135deg,#f59e0b,#ef4444)",
              borderRadius: "99px", padding: "3px 10px",
              fontSize: "10px", fontWeight: "800", color: "#fff", letterSpacing: "1px",
            }}>
              <Shield style={{ width: "9px", height: "9px" }} /> SUPER ADMIN
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {SIDEBAR_ITEMS.map(item => {
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => { setTab(item.id as AdminTab); setSidebarOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 12px", borderRadius: "9px", border: "none", cursor: "pointer",
                    background: active ? "rgba(99,102,241,0.2)" : "transparent",
                    color: active ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                    fontWeight: active ? "600" : "400",
                    fontSize: "13px", transition: "all 0.15s", textAlign: "left",
                    borderLeft: active ? "2px solid #6366f1" : "2px solid transparent",
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <item.icon style={{ width: "16px", height: "16px", flexShrink: 0 }} />
                  {item.label}
                  {item.id === "tenants" && kpi && (
                    <span style={{
                      marginLeft: "auto", background: "rgba(99,102,241,0.3)",
                      color: "#a5b4fc", borderRadius: "99px",
                      padding: "1px 7px", fontSize: "10px", fontWeight: "700",
                    }}>{kpi.totalTenants}</span>
                  )}
                  {item.id === "staff" && kpi && (
                    <span style={{
                      marginLeft: "auto", background: "rgba(16,185,129,0.2)",
                      color: "#6ee7b7", borderRadius: "99px",
                      padding: "1px 7px", fontSize: "10px", fontWeight: "700",
                    }}>{kpi.totalStaff}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User + Sign out */}
          <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ padding: "8px 12px", marginBottom: "4px" }}>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginBottom: "1px" }}>Signed in as</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </div>
            </div>
            <button onClick={handleSignOut} style={{
              display: "flex", alignItems: "center", gap: "8px",
              width: "100%", padding: "9px 12px", borderRadius: "9px",
              border: "none", cursor: "pointer",
              background: "rgba(239,68,68,0.12)", color: "#fca5a5",
              fontSize: "13px", fontWeight: "600", transition: "background 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.22)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(239,68,68,0.12)")}
            >
              <LogOut style={{ width: "14px", height: "14px" }} /> Sign out
            </button>
          </div>
        </aside>
      </>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          background: "#0f172a", borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "0 20px", height: "62px", display: "flex",
          alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Hamburger toggle */}
            <button onClick={() => setSidebarOpen(o => !o)} style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px", padding: "7px 9px", cursor: "pointer", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {sidebarOpen
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              }
            </button>
            <div>
              {/* Brand + badge */}
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "2px" }}>
                <span style={{ color: "#fff", fontWeight: "800", fontSize: "14px", letterSpacing: "-0.3px" }}>
                  ⚡ PosifyPro
                </span>
                <span style={{
                  background: "linear-gradient(135deg,#f59e0b,#ef4444)", borderRadius: "99px",
                  padding: "1px 8px", fontSize: "9px", fontWeight: "800", color: "#fff", letterSpacing: "0.8px",
                }}>SUPER ADMIN</span>
              </div>
              {/* Date · time · page */}
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", gap: "4px" }}>
                <span>{new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                <span>·</span>
                <span>{new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}</span>
                <span>·</span>
                <span style={{ color: "#a5b4fc", fontWeight: "600" }}>{SIDEBAR_ITEMS.find(s => s.id === tab)?.label}</span>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Live status */}
            <div style={{
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: "8px", padding: "5px 11px", display: "flex", alignItems: "center", gap: "5px",
              fontSize: "11px", fontWeight: "600", color: "#34d399",
            }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
              {kpi?.activeTenants ?? 0} live
            </div>
            <button
              onClick={() => { setRefreshing(true); fetchData(); }}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "7px 9px", cursor: "pointer", color: "#94a3b8", display: "flex" }}
            >
              <RefreshCw style={{ width: "14px", height: "14px", animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto", paddingBottom: isMobile ? "80px" : "24px" }}>

          {/* ════════════════════════════════
              OVERVIEW
          ════════════════════════════════ */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>

              {/* KPI cards — NO revenue/orders */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "12px" }}>
                <KPICard label="Total Businesses" value={String(kpi?.totalTenants ?? 0)} icon={Building2} color="#6366f1" trend={kpi?.tenantGrowth} sub={`${kpi?.newThisMonth ?? 0} new this month`} loading={loading} />
                <KPICard label="Active" value={String(kpi?.activeTenants ?? 0)} icon={CheckCircle2} color="#10b981" sub={`${kpi && kpi.totalTenants ? Math.round((kpi.activeTenants / kpi.totalTenants) * 100) : 0}% of total`} loading={loading} />
                <KPICard label="Suspended" value={String(kpi?.suspendedTenants ?? 0)} icon={AlertTriangle} color="#ef4444" loading={loading} />
                <KPICard label="Total Staff" value={String(kpi?.totalStaff ?? 0)} icon={Users} color="#8b5cf6" sub="All businesses" loading={loading} />
                <KPICard label="Pro Businesses" value={String(kpi?.proTenants ?? 0)} icon={Crown} color="#f59e0b" sub={`${kpi?.basicTenants ?? 0} on Basic`} loading={loading} />
                <KPICard label="New This Month" value={String(kpi?.newThisMonth ?? 0)} icon={TrendingUp} color="#3b82f6" trend={kpi?.tenantGrowth} loading={loading} />
              </div>

              {/* Charts row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: "16px" }}>

                {/* Growth chart */}
                <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 4px", fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>Business Growth</h3>
                  <p style={{ margin: "0 0 16px", fontSize: "11px", color: "#94a3b8" }}>Cumulative businesses — last 6 months</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={growthData}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="tenants" stroke="#6366f1" strokeWidth={2.5} fill="url(#g1)" name="Businesses" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* New per month bar */}
                <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 4px", fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>New Signups / Month</h3>
                  <p style={{ margin: "0 0 16px", fontSize: "11px", color: "#94a3b8" }}>Businesses joined per month</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={growthData.map((d, i, arr) => ({
                      month: d.month,
                      new: i === 0 ? d.tenants : d.tenants - arr[i - 1].tenants,
                    }))} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="new" fill="#10b981" radius={[4, 4, 0, 0]} name="New" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Plan split donut */}
                <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 4px", fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>Plan Split</h3>
                  <p style={{ margin: "0 0 12px", fontSize: "11px", color: "#94a3b8" }}>Subscription distribution</p>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={planDist} cx="50%" cy="50%" innerRadius={38} outerRadius={55} paddingAngle={3} dataKey="value">
                        {planDist.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                    {planDist.map((p, i) => (
                      <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: PLAN_COLORS[i], display: "inline-block" }} />
                          <span style={{ fontSize: "12px", color: "#64748b" }}>{p.name}</span>
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>
                          {p.value} ({kpi?.totalTenants ? Math.round((p.value / kpi.totalTenants) * 100) : 0}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent businesses */}
              <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ margin: 0, fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>Recently Joined</h3>
                  <button onClick={() => setTab("tenants")} style={{
                    display: "flex", alignItems: "center", gap: "3px", fontSize: "12px",
                    color: "#6366f1", fontWeight: "600", background: "none", border: "none", cursor: "pointer",
                  }}>
                    View all <ChevronRight style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
                  {tenants.slice(0, 6).map(t => (
                    <div key={t.id}
                      onClick={() => { setSelectedTenant(t); setTab("tenants"); }}
                      style={{
                        border: "1px solid #f1f5f9", borderRadius: "12px", padding: "14px",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#c7d2fe"; (e.currentTarget as HTMLElement).style.background = "#fafffe"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#f1f5f9"; (e.currentTarget as HTMLElement).style.background = "#fff"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                        <div style={{
                          width: "34px", height: "34px", borderRadius: "9px",
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: "800", fontSize: "14px",
                        }}>{t.name.charAt(0).toUpperCase()}</div>
                        <PlanBadge plan={t.plan} />
                      </div>
                      <div style={{ fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "8px" }}>{t.email}</div>
                      <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "#64748b" }}>
                        <span>👥 {t.staff_count} staff</span>
                        <span>🧾 {t.order_count} orders</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              TENANTS / BUSINESSES
          ════════════════════════════════ */}
          {tab === "tenants" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Filters */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                  <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8" }} />
                  <input placeholder="Search businesses..." value={search} onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "9px", border: "1.5px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box", background: "#fff" }}
                    onFocus={e => e.target.style.borderColor = "#6366f1"}
                    onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                  />
                </div>
                {(["all","free","basic","pro"] as const).map(p => (
                  <button key={p} onClick={() => setFilterPlan(p)} style={{
                    padding: "7px 13px", borderRadius: "99px", border: "1.5px solid",
                    borderColor: filterPlan === p ? "#6366f1" : "#e2e8f0",
                    background: filterPlan === p ? "#6366f1" : "#fff",
                    color: filterPlan === p ? "#fff" : "#64748b",
                    fontSize: "12px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
                  }}>{p === "all" ? "All Plans" : p}</button>
                ))}
                <div style={{ width: "1px", height: "18px", background: "#e2e8f0" }} />
                {(["all","active","suspended"] as const).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{
                    padding: "7px 13px", borderRadius: "99px", border: "1.5px solid",
                    borderColor: filterStatus === s ? "#0f172a" : "#e2e8f0",
                    background: filterStatus === s ? "#0f172a" : "#fff",
                    color: filterStatus === s ? "#fff" : "#64748b",
                    fontSize: "12px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
                  }}>{s === "all" ? "All Status" : s}</button>
                ))}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{
                  padding: "7px 11px", borderRadius: "9px", border: "1.5px solid #e2e8f0",
                  fontSize: "12px", color: "#64748b", background: "#fff", outline: "none",
                }}>
                  <option value="newest">Newest first</option>
                  <option value="staff">Most staff</option>
                  <option value="orders">Most orders</option>
                </select>
                <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "auto" }}>
                  {filtered.length} of {tenants.length}
                </span>
              </div>

              {/* Table */}
              <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1.5fr 70px 80px 110px 100px",
                  padding: "11px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
                  fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  <span>Business</span><span>Contact</span><span>Staff</span><span>Orders</span><span>Plan</span><span>Status</span>
                </div>
                {loading ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading…</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>No businesses found</div>
                ) : (
                  filtered.map((t, i) => (
                    <div key={t.id}
                      onClick={() => setSelectedTenant(selectedTenant?.id === t.id ? null : t)}
                      style={{
                        display: "grid", gridTemplateColumns: "2fr 1.5fr 70px 80px 110px 100px",
                        padding: "13px 20px", cursor: "pointer", alignItems: "center",
                        borderBottom: i < filtered.length - 1 ? "1px solid #f8fafc" : "none",
                        background: selectedTenant?.id === t.id ? "#f5f3ff" : "transparent",
                        transition: "background 0.1s", opacity: t.is_active ? 1 : 0.6,
                      }}
                      onMouseEnter={e => { if (selectedTenant?.id !== t.id) (e.currentTarget as HTMLElement).style.background = "#f8fafc"; }}
                      onMouseLeave={e => { if (selectedTenant?.id !== t.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "#fff", fontWeight: "800", fontSize: "12px",
                        }}>{t.name.charAt(0).toUpperCase()}</div>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a" }}>{t.name}</div>
                          <div style={{ fontSize: "10px", color: "#94a3b8" }}>/{t.slug}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.email}</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{t.staff_count}</div>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{t.order_count}</div>
                      <PlanBadge plan={t.plan} />
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "600", color: t.is_active ? "#10b981" : "#ef4444" }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: t.is_active ? "#10b981" : "#ef4444", display: "inline-block" }} />
                        {t.is_active ? "Active" : "Suspended"}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Action panel */}
              {selectedTenant && (
                <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #e0e7ff", padding: "20px", boxShadow: "0 4px 20px rgba(99,102,241,0.08)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "42px", height: "42px", borderRadius: "11px",
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: "800", fontSize: "17px",
                      }}>{selectedTenant.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight: "800", fontSize: "15px", color: "#0f172a" }}>{selectedTenant.name}</div>
                        <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                          {selectedTenant.email} · Joined {new Date(selectedTenant.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button onClick={() => setSelectedTenant(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                      <X style={{ width: "17px", height: "17px" }} />
                    </button>
                  </div>

                  {/* Quick stats — no revenue */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "18px", flexWrap: "wrap" }}>
                    {[
                      { label: "Staff",    value: selectedTenant.staff_count, icon: "👥" },
                      { label: "Orders",   value: selectedTenant.order_count, icon: "🧾" },
                      { label: "Currency", value: selectedTenant.currency,    icon: "🌍" },
                      { label: "Slug",     value: `/${selectedTenant.slug}`,  icon: "🔗" },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "11px 15px", flex: 1, minWidth: "90px" }}>
                        <div style={{ fontSize: "16px", marginBottom: "3px" }}>{s.icon}</div>
                        <div style={{ fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>{s.value}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748b" }}>Change Plan:</span>
                    {(["free","basic","pro"] as const).map(plan => (
                      <button key={plan} onClick={() => changePlan(selectedTenant, plan)}
                        disabled={actionLoading || selectedTenant.plan === plan}
                        style={{
                          padding: "7px 15px", borderRadius: "8px", border: "none",
                          fontWeight: "600", fontSize: "12px", cursor: "pointer",
                          background: selectedTenant.plan === plan ? PLAN_CFG[plan].color : PLAN_CFG[plan].bg,
                          color: selectedTenant.plan === plan ? "#fff" : PLAN_CFG[plan].color,
                          opacity: actionLoading ? 0.6 : 1, textTransform: "capitalize",
                        }}>
                        {selectedTenant.plan === plan ? `✓ ${plan}` : plan}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => toggleStatus(selectedTenant)} disabled={actionLoading}
                      style={{
                        padding: "8px 18px", borderRadius: "8px", border: "none",
                        fontWeight: "600", fontSize: "13px", cursor: "pointer",
                        background: selectedTenant.is_active ? "#fef2f2" : "#f0fdf4",
                        color: selectedTenant.is_active ? "#ef4444" : "#16a34a",
                        opacity: actionLoading ? 0.6 : 1, display: "flex", alignItems: "center", gap: "6px",
                      }}>
                      {selectedTenant.is_active
                        ? <><XCircle style={{ width: "13px", height: "13px" }} /> Suspend</>
                        : <><CheckCircle2 style={{ width: "13px", height: "13px" }} /> Activate</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════
              ANALYTICS
          ════════════════════════════════ */}
          {tab === "analytics" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Growth trend */}
              <div style={{ background: "#fff", borderRadius: "14px", padding: "22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 4px", fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>Business Growth Trend</h3>
                <p style={{ margin: "0 0 18px", fontSize: "12px", color: "#94a3b8" }}>Cumulative businesses on the platform — last 6 months</p>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="tenants" stroke="#6366f1" strokeWidth={2.5} fill="url(#g2)" name="Businesses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Top businesses by orders */}
                <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>Top Businesses by Orders</h3>
                  {tenants.sort((a, b) => (b.order_count ?? 0) - (a.order_count ?? 0)).slice(0, 6).map((t, i) => {
                    const max = tenants[0]?.order_count ?? 1;
                    const pct = max > 0 ? Math.round(((t.order_count ?? 0) / max) * 100) : 0;
                    return (
                      <div key={t.id} style={{ marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "11px", color: "#94a3b8", width: "14px" }}>#{i + 1}</span>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{t.name}</span>
                            <PlanBadge plan={t.plan} />
                          </div>
                          <span style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a" }}>{t.order_count} orders</span>
                        </div>
                        <div style={{ background: "#f1f5f9", borderRadius: "99px", height: "5px" }}>
                          <div style={{ width: `${pct}%`, height: "5px", borderRadius: "99px", background: "linear-gradient(90deg,#6366f1,#8b5cf6)", transition: "width 0.6s" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Metrics summary */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Plan revenue bar */}
                  <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <h3 style={{ margin: "0 0 14px", fontWeight: "700", fontSize: "13px", color: "#0f172a" }}>Staff Distribution by Plan</h3>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={[
                        { plan: "Free",  staff: allStaff.filter(s => tenants.find(t => t.id === s.tenant_id && t.plan === "free")).length },
                        { plan: "Basic", staff: allStaff.filter(s => tenants.find(t => t.id === s.tenant_id && t.plan === "basic")).length },
                        { plan: "Pro",   staff: allStaff.filter(s => tenants.find(t => t.id === s.tenant_id && t.plan === "pro")).length },
                      ]} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="plan" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="staff" radius={[5, 5, 0, 0]} name="Staff">
                          {[0,1,2].map(i => <Cell key={i} fill={PLAN_COLORS[i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Key metrics */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {[
                      { label: "Avg Staff/Business", value: kpi && kpi.totalTenants > 0 ? (kpi.totalStaff / kpi.totalTenants).toFixed(1) : "0" },
                      { label: "Paid Conversion", value: `${kpi && kpi.totalTenants > 0 ? Math.round(((kpi.proTenants + kpi.basicTenants) / kpi.totalTenants) * 100) : 0}%` },
                      { label: "Suspension Rate", value: `${kpi && kpi.totalTenants > 0 ? Math.round((kpi.suspendedTenants / kpi.totalTenants) * 100) : 0}%` },
                      { label: "Pro Rate", value: `${kpi && kpi.totalTenants > 0 ? Math.round((kpi.proTenants / kpi.totalTenants) * 100) : 0}%` },
                    ].map(s => (
                      <div key={s.label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "12px" }}>
                        <div style={{ fontSize: "18px", fontWeight: "800", color: "#0f172a" }}>{s.value}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              ALL STAFF
          ════════════════════════════════ */}
          {tab === "staff" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ position: "relative", maxWidth: "360px" }}>
                <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#94a3b8" }} />
                <input placeholder="Search staff..." value={staffSearch} onChange={e => setStaffSearch(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "9px", border: "1.5px solid #e2e8f0", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
              </div>

              <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f1f5f9", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1.5fr 120px 120px",
                  padding: "11px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
                  fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  <span>Staff Member</span><span>Business</span><span>Role</span><span>Status</span>
                </div>
                {filteredStaff.length === 0 ? (
                  <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>No staff found</div>
                ) : (
                  filteredStaff.map((s, i) => {
                    const roleCfg = ROLE_CFG[s.role] ?? ROLE_CFG.cashier;
                    const RoleIcon = roleCfg.icon;
                    return (
                      <div key={s.id} style={{
                        display: "grid", gridTemplateColumns: "2fr 1.5fr 120px 120px",
                        padding: "12px 20px", alignItems: "center",
                        borderBottom: i < filteredStaff.length - 1 ? "1px solid #f8fafc" : "none",
                        transition: "background 0.1s",
                      }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px", height: "32px", borderRadius: "99px",
                            background: roleCfg.bg, display: "flex", alignItems: "center",
                            justifyContent: "center", color: roleCfg.color, fontWeight: "800", fontSize: "12px",
                          }}>
                            {s.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <div style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a" }}>{s.full_name}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{s.email}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{(s.tenants as any)?.name ?? "—"}</div>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          background: roleCfg.bg, color: roleCfg.color, padding: "3px 9px",
                          borderRadius: "99px", fontSize: "11px", fontWeight: "700",
                        }}>
                          <RoleIcon style={{ width: "10px", height: "10px" }} />
                          {s.role?.charAt(0).toUpperCase() + s.role?.slice(1)}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: "600", color: s.is_active ? "#10b981" : "#ef4444" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: s.is_active ? "#10b981" : "#ef4444", display: "inline-block" }} />
                          {s.is_active ? "Active" : "Suspended"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              ACTIVITY
          ════════════════════════════════ */}
          {tab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "#fff", borderRadius: "14px", padding: "22px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>Recent Business Signups</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {tenants.slice(0, 15).map((t, i) => (
                    <div key={t.id} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "12px 0", borderBottom: i < 14 ? "1px solid #f8fafc" : "none",
                    }}>
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "9px", flexShrink: 0,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: "800", fontSize: "13px",
                      }}>{t.name.charAt(0).toUpperCase()}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>
                          <strong>{t.name}</strong> joined PosifyPro
                        </div>
                        <div style={{ fontSize: "11px", color: "#94a3b8" }}>{t.email}</div>
                      </div>
                      <PlanBadge plan={t.plan} />
                      <div style={{ fontSize: "11px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(t.created_at).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                  ))}
                  {tenants.length === 0 && (
                    <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No activity yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════
              SETTINGS
          ════════════════════════════════ */}
          {tab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "540px" }}>
              <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 18px", fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>Admin Account</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  {[
                    { label: "Email",    value: user?.email ?? "—" },
                    { label: "Role",     value: "Super Admin"      },
                    { label: "Platform", value: "PosifyPro v2.0"   },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8fafc", borderRadius: "9px" }}>
                      <span style={{ fontSize: "13px", color: "#64748b" }}>{r.label}</span>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#0f172a" }}>{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: "#fff", borderRadius: "14px", padding: "24px", border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 18px", fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>Platform Stats</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {[
                    { label: "Total Businesses", value: kpi?.totalTenants ?? 0 },
                    { label: "Active",           value: kpi?.activeTenants ?? 0 },
                    { label: "Total Staff",      value: kpi?.totalStaff ?? 0 },
                    { label: "Pro Subscribers",  value: kpi?.proTenants ?? 0 },
                  ].map(s => (
                    <div key={s.label} style={{ background: "#f8fafc", borderRadius: "9px", padding: "14px" }}>
                      <div style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}>{s.value}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={handleSignOut} style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                padding: "12px", borderRadius: "10px", border: "none", cursor: "pointer",
                background: "#fef2f2", color: "#ef4444", fontWeight: "700", fontSize: "14px",
              }}>
                <LogOut style={{ width: "16px", height: "16px" }} /> Sign out of Admin
              </button>
            </div>
          )}
        </div>

        {/* Mobile bottom nav */}
        {isMobile && (
          <div style={{
            position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
            background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.08)",
            display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
            padding: "6px 0 10px",
          }}>
            {SIDEBAR_ITEMS.map(item => {
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => { setTab(item.id as AdminTab); setSidebarOpen(false); }}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    background: "none", border: "none", cursor: "pointer",
                    color: active ? "#a5b4fc" : "rgba(255,255,255,0.35)",
                    padding: "4px 2px",
                  }}>
                  <item.icon style={{ width: "18px", height: "18px" }} />
                  <span style={{ fontSize: "8px", fontWeight: active ? "700" : "400" }}>
                    {item.label.split(" ")[0]}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      </div>
      </div>
      </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

   