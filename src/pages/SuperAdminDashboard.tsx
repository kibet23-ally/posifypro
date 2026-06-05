// src/pages/SuperAdminDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import LicenseManager from "@/components/admin/LicenseManager";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, Building2, TrendingUp, Users, Crown,
  Shield, UserCheck, CheckCircle2, XCircle, LogOut, Zap,
  RefreshCw, Search, X, ChevronRight, Bell, Settings, Key, AlertTriangle,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────
type AdminTab = "overview" | "tenants" | "analytics" | "staff" | "licenses" | "activity" | "settings";

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

interface GrowthPoint { month: string; tenants: number; }

// ── Constants ──────────────────────────────────────────────
const PLAN_CFG = {
  free:  { color: "#94a3b8", bg: "#f1f5f9", label: "Free"  },
  basic: { color: "#3b82f6", bg: "#eff6ff", label: "Basic" },
  pro:   { color: "#8b5cf6", bg: "#f5f3ff", label: "Pro"   },
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const SIDEBAR_ITEMS = [
  { id: "overview",  label: "Overview",   icon: LayoutDashboard },
  { id: "tenants",   label: "Businesses", icon: Building2       },
  { id: "analytics", label: "Analytics",  icon: TrendingUp      },
  { id: "staff",     label: "All Staff",  icon: Users           },
  { id: "licenses",  label: "Licenses",   icon: Key             },
  { id: "activity",  label: "Activity",   icon: Bell            },
  { id: "settings",  label: "Settings",   icon: Settings        },
] as const;

const ROLE_CFG: Record<string, { color: string; bg: string; icon: React.ComponentType<any> }> = {
  owner:   { color: "#f59e0b", bg: "#fffbeb", icon: Crown     },
  manager: { color: "#3b82f6", bg: "#eff6ff", icon: Shield    },
  cashier: { color: "#10b981", bg: "#f0fdf4", icon: UserCheck },
};

// ── Helpers ────────────────────────────────────────────────
const fmtShort = (n: number) =>
  n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `${(n/1_000).toFixed(1)}K`
  : String(n);

// ── KPI Card ───────────────────────────────────────────────
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f172a", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#fff" }}>
      <div style={{ color: "#94a3b8", marginBottom: "4px" }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ fontWeight: "700" }}>{p.name}: {p.value}</div>
      ))}
    </div>
  );
};

// ── Main Component ─────────────────────────────────────────
export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);
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
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" && window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single()
      .then(({ data }) => { if (data?.role !== "super_admin") navigate({ to: "/dashboard" }); });
  }, [user, navigate]);

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: tenantsRaw } = await supabase
        .from("tenants").select("*").neq("slug", "posifypro").order("created_at", { ascending: false });
      if (!tenantsRaw) return;

      const enriched: Tenant[] = await Promise.all(
        tenantsRaw.map(async t => {
          const [staffRes, orderRes] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
            supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", t.id),
          ]);
          return { ...t, staff_count: staffRes.count ?? 0, order_count: orderRes.count ?? 0 };
        })
      );
      setTenants(enriched);

      const { data: staffData } = await supabase
        .from("profiles").select("*, tenants(name)").neq("role", "super_admin").order("created_at", { ascending: false });
      setAllStaff(staffData ?? []);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const newThisMonth = enriched.filter(t => new Date(t.created_at) >= monthStart).length;
      const newLastMonth = enriched.filter(t => { const d = new Date(t.created_at); return d >= lastMonthStart && d < monthStart; }).length;

      setKpi({
        totalTenants: enriched.length,
        activeTenants: enriched.filter(t => t.is_active).length,
        suspendedTenants: enriched.filter(t => !t.is_active).length,
        newThisMonth,
        totalStaff: (staffData ?? []).length,
        proTenants: enriched.filter(t => t.plan === "pro").length,
        basicTenants: enriched.filter(t => t.plan === "basic").length,
        freeTenants: enriched.filter(t => t.plan === "free").length,
        tenantGrowth: newLastMonth > 0 ? Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100) : newThisMonth > 0 ? 100 : 0,
      });

      const growth: GrowthPoint[] = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        return { month: MONTHS[d.getMonth()], tenants: enriched.filter(t => new Date(t.created_at) <= mEnd).length };
      });
      setGrowthData(growth);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

  const sidebarW = 240;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 40 }} />
      )}

      {/* Sidebar */}
      <aside style={{
        width: `${sidebarW}px`, background: "#0f172a", display: "flex",
        flexDirection: "column", flexShrink: 0, height: "100vh",
        ...(isMobile ? {
          position: "fixed" as any, left: sidebarOpen ? 0 : `-${sidebarW}px`,
          top: 0, zIndex: 50, transition: "left 0.25s ease",
        } : { position: "sticky" as any, top: 0 }),
      }}>
        {/* Logo + Mobile Close */}
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
              <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "8px", padding: "6px 8px" }}>
                <Zap style={{ width: "15px", height: "15px", color: "#fff" }} />
              </div>
              <span style={{ color: "#fff", fontWeight: "800", fontSize: "15px" }}>PosifyPro</span>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "12px" }}>
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); if (isMobile) setSidebarOpen(false); }}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: "10px",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isActive ? "#fff" : "#94a3b8",
                  display: "flex", alignItems: "center", gap: "12px",
                  marginBottom: "4px", fontWeight: isActive ? "600" : "500",
                  border: "none", cursor: "pointer", textAlign: "left",
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <button
            onClick={handleSignOut}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", color: "#f87171", border: "none", cursor: "pointer", fontSize: "14px" }}
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div style={{ flex: 1, marginLeft: isMobile ? 0 : `${sidebarW}px` }}>
        {/* Top Header */}
        <header style={{ background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setSidebarOpen(true)} style={{ display: isMobile ? "block" : "none", background: "none", border: "none" }}>
              <LayoutDashboard size={22} />
            </button>
            <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: 0 }}>
              {SIDEBAR_ITEMS.find(i => i.id === tab)?.label || "Dashboard"}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={fetchData} disabled={refreshing} style={{ padding: "8px 14px", borderRadius: "8px", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div style={{ padding: "24px" }}>
          {/* OVERVIEW TAB */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              {/* KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <KPICard label="Total Businesses" value={kpi?.totalTenants.toString() ?? "0"} icon={Building2} color="#6366f1" loading={loading} />
                <KPICard label="Active" value={kpi?.activeTenants.toString() ?? "0"} icon={CheckCircle2} color="#10b981" loading={loading} />
                <KPICard label="New This Month" value={kpi?.newThisMonth.toString() ?? "0"} icon={TrendingUp} color="#8b5cf6" trend={kpi?.tenantGrowth} loading={loading} />
                <KPICard label="Total Staff" value={kpi?.totalStaff.toString() ?? "0"} icon={Users} color="#f59e0b" loading={loading} />
              </div>

              {/* Charts */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px" }}>
                <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: "600" }}>Business Growth</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={growthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="natural" dataKey="tenants" stroke="#6366f1" fill="#6366f120" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #f1f5f9" }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: "600" }}>Plan Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={planDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                        {planDist.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={["#94a3b8", "#3b82f6", "#8b5cf6"][index]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TENANTS TAB */}
          {tab === "tenants" && (
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
                  <Search style={{ position: "absolute", left: "14px", top: "12px", color: "#94a3b8" }} size={18} />
                  <input
                    type="text"
                    placeholder="Search businesses..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px 12px 44px", borderRadius: "10px", border: "1px solid #e2e8f0" }}
                  />
                </div>

                {/* Plan & Status filters + Sort */}
                {/* ... (you can keep or expand this section) */}
              </div>

              {/* Tenant List */}
              <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f1f5f9" }}>
                {filtered.map(t => (
                  <div key={t.id} style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: "16px" }}>
                    {/* Tenant info + actions */}
                    {/* ... (your original tenant row content) */}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STAFF TAB */}
          {tab === "staff" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Search staff..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", width: "320px" }}
                />
              </div>

              <div style={{ background: "#fff", borderRadius: "14px", padding: "16px", border: "1px solid #f1f5f9" }}>
                {filteredStaff.map((s) => {
                  const roleCfg = ROLE_CFG[s.role] || { color: "#64748b", bg: "#f1f5f9", icon: Shield };
                  const RoleIcon = roleCfg.icon;
                  return (
                    <div key={s.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #f8fafc" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {s.full_name?.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontWeight: "600", fontSize: "14px" }}>{s.full_name}</div>
                          <div style={{ fontSize: "13px", color: "#64748b" }}>{s.email}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: "13px", color: "#64748b" }}>{(s.tenants as any)?.name ?? "—"}</div>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", background: roleCfg.bg, color: roleCfg.color, padding: "4px 10px", borderRadius: "99px", fontSize: "12px", fontWeight: "600" }}>
                        <RoleIcon style={{ width: "14px", height: "14px" }} />
                        {s.role}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LICENSES TAB */}
          {tab === "licenses" && <LicenseManager adminId={user?.id ?? ""} />}

          {/* ACTIVITY & SETTINGS TABS */}
          {tab === "activity" && ( /* your activity content */ )}
          {tab === "settings" && ( /* your settings content */ )}

        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
 