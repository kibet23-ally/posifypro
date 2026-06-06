// src/pages/SuperAdminDashboard.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import LicenseManager from "@/components/admin/LicenseManager";
import {
  LayoutDashboard, Building2, Users, LogOut,
  RefreshCw, Search, Key, Shield, TrendingUp,
  Crown, CheckCircle2, AlertTriangle, X, ChevronRight, Zap,
} from "lucide-react";

type AdminTab = "overview" | "tenants" | "staff" | "licenses";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  plan: string;
  is_active: boolean;
  created_at: string;
  currency: string;
  staff_count?: number;
  order_count?: number;
}

const PLAN_COLORS: Record<string, { c: string; bg: string }> = {
  free:         { c: "#94a3b8", bg: "#f1f5f9" },
  basic:        { c: "#3b82f6", bg: "#eff6ff" },
  pro:          { c: "#8b5cf6", bg: "#f5f3ff" },
  starter:      { c: "#3b82f6", bg: "#eff6ff" },
  professional: { c: "#6366f1", bg: "#f0f0ff" },
  enterprise:   { c: "#f59e0b", bg: "#fffbeb" },
};

function PlanBadge({ plan }: { plan: string }) {
  const c = PLAN_COLORS[plan] ?? PLAN_COLORS.free;
  return (
    <span style={{
      background: c.bg, color: c.c, padding: "2px 9px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      border: `1px solid ${c.c}30`,
    }}>
      {plan}
    </span>
  );
}

function KCard({ label, value, color = "#6366f1" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 14, padding: 18,
      border: "1px solid #f1f5f9", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
    </div>
  );
}

const NAV_ITEMS: { id: AdminTab; label: string; icon: any }[] = [
  { id: "overview", label: "Overview",   icon: LayoutDashboard },
  { id: "tenants",  label: "Businesses", icon: Building2 },
  { id: "staff",    label: "All Staff",  icon: Users },
  { id: "licenses", label: "Licenses",   icon: Key },
];

export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [allStaff, setAllStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guard: must be super_admin
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "super_admin") {
          navigate({ to: "/dashboard" });
        }
      });
  }, [user, navigate]);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      // Fetch all tenants except the system posifypro tenant
      const { data: tr, error: trErr } = await supabase
        .from("tenants")
        .select("*")
        .neq("slug", "posifypro")
        .order("created_at", { ascending: false });

      if (trErr) throw trErr;
      if (!tr) return;

      // Enrich with staff + order counts
      const enriched: Tenant[] = await Promise.all(
        (tr as any[]).map(async (t) => {
          const [sr, or] = await Promise.all([
            supabase
              .from("profiles")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", t.id),
            supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("tenant_id", t.id),
          ]);
          return {
            ...t,
            staff_count: sr.count ?? 0,
            order_count: or.count ?? 0,
          };
        })
      );
      setTenants(enriched);

      // All staff across all tenants
      const { data: sd, error: sdErr } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, tenant_id, is_active, tenants(name)")
        .neq("role", "super_admin")
        .order("created_at", { ascending: false });

      if (sdErr) throw sdErr;
      setAllStaff((sd ?? []) as any[]);

    } catch (err: any) {
      setError(err.message ?? "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleStatus = async (t: Tenant) => {
    setActionLoading(true);
    const { error } = await supabase
      .from("tenants")
      .update({ is_active: !t.is_active })
      .eq("id", t.id);
    if (!error) {
      await load();
      setSelected(prev => prev ? { ...prev, is_active: !t.is_active } : null);
    }
    setActionLoading(false);
  };

  const changePlan = async (t: Tenant, plan: string) => {
    setActionLoading(true);
    await supabase.from("tenants").update({ plan }).eq("id", t.id);
    await load();
    setSelected(prev => prev ? { ...prev, plan } : null);
    setActionLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    return !q || t.name.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
  });

  const totals = {
    total: tenants.length,
    active: tenants.filter(t => t.is_active).length,
    suspended: tenants.filter(t => !t.is_active).length,
    staff: allStaff.length,
  };

  if (!user) {
    return (
      <div style={{ padding: 24, color: "#64748b" }}>
        Sign in required. <a href="/login" style={{ color: "#6366f1" }}>Go to login</a>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8fafc",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: "flex",
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        background: "#0f172a",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 8, padding: "5px 8px" }}>
              <Zap style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>PosifyPro</span>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
            borderRadius: 99, padding: "2px 8px",
            fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: 1,
          }}>
            <Shield style={{ width: 8, height: 8 }} /> SUPER ADMIN
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_ITEMS.map(n => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "9px 10px",
                  borderRadius: 8, border: "none", cursor: "pointer",
                  background: active ? "rgba(99,102,241,0.2)" : "transparent",
                  color: active ? "#a5b4fc" : "rgba(255,255,255,0.5)",
                  fontWeight: active ? 600 : 400, fontSize: 13,
                  display: "flex", alignItems: "center", gap: 8,
                  borderLeft: active ? "2px solid #6366f1" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                <n.icon style={{ width: 15, height: 15 }} />
                {n.label}
                {n.id === "tenants" && (
                  <span style={{
                    marginLeft: "auto", background: "rgba(99,102,241,0.3)",
                    color: "#a5b4fc", borderRadius: 99, padding: "1px 6px",
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {totals.total}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User + sign out */}
        <div style={{ padding: "10px 8px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{
            padding: "6px 10px", marginBottom: 4,
            fontSize: 11, color: "rgba(255,255,255,0.4)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user.email}
          </div>
          <button
            onClick={handleSignOut}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 6,
              padding: "8px 10px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "rgba(239,68,68,0.12)", color: "#fca5a5",
              fontSize: 12, fontWeight: 600,
            }}
          >
            <LogOut style={{ width: 13, height: 13 }} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{
          background: "#0f172a", padding: "0 20px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 10, flexShrink: 0,
        }}>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
              {NAV_ITEMS.find(n => n.id === tab)?.label}
            </div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
              {new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
              borderRadius: 8, padding: "4px 10px",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 600, color: "#34d399",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34d399", display: "inline-block" }} />
              {totals.active} live
            </div>
            <button
              onClick={load}
              disabled={refreshing}
              style={{
                background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "6px 8px", cursor: "pointer",
                color: "#94a3b8", display: "flex",
              }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: "#fef2f2", borderBottom: "1px solid #fecaca",
            padding: "10px 20px", fontSize: 13, color: "#dc2626",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>
        )}

        {/* Page content */}
        <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>

          {/* ── OVERVIEW ── */}
          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Platform Overview</h1>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <KCard label="Total Businesses" value={totals.total} />
                <KCard label="Active" value={totals.active} color="#10b981" />
                <KCard label="Suspended" value={totals.suspended} color="#ef4444" />
                <KCard label="Total Staff" value={totals.staff} color="#8b5cf6" />
              </div>

              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0f172a" }}>Recently Joined</h2>
                  <button
                    onClick={() => setTab("tenants")}
                    style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: "#6366f1", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
                  >
                    View all <ChevronRight style={{ width: 13, height: 13 }} />
                  </button>
                </div>
                {loading && <p style={{ color: "#94a3b8", fontSize: 13 }}>Loading…</p>}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {tenants.slice(0, 8).map((t, i) => (
                    <div
                      key={t.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 0",
                        borderBottom: i < Math.min(tenants.length, 8) - 1 ? "1px solid #f8fafc" : "none",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 800, fontSize: 12,
                      }}>
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{t.email}</div>
                      </div>
                      <PlanBadge plan={t.plan} />
                      <div style={{ fontSize: 11, color: t.is_active ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                        {t.is_active ? "Active" : "Suspended"}
                      </div>
                    </div>
                  ))}
                  {tenants.length === 0 && !loading && (
                    <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "20px 0" }}>No businesses yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── TENANTS ── */}
          {tab === "tenants" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: "#94a3b8" }} />
                  <input
                    placeholder="Search businesses…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px 8px 30px", borderRadius: 9, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} of {tenants.length} businesses</span>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1.5fr 70px 80px 110px 100px",
                  padding: "10px 16px", background: "#f8fafc",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 10, fontWeight: 700, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  <span>Business</span>
                  <span>Contact</span>
                  <span>Staff</span>
                  <span>Orders</span>
                  <span>Plan</span>
                  <span>Status</span>
                </div>

                {loading && (
                  <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Loading…</div>
                )}
                {!loading && filtered.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No businesses found</div>
                )}

                {filtered.map((t, i) => (
                  <div
                    key={t.id}
                    onClick={() => setSelected(selected?.id === t.id ? null : t)}
                    style={{
                      display: "grid", gridTemplateColumns: "2fr 1.5fr 70px 80px 110px 100px",
                      padding: "12px 16px", cursor: "pointer", alignItems: "center",
                      borderBottom: i < filtered.length - 1 ? "1px solid #f8fafc" : "none",
                      background: selected?.id === t.id ? "#f5f3ff" : "transparent",
                      opacity: t.is_active ? 1 : 0.6,
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => {
                      if (selected?.id !== t.id) (e.currentTarget as HTMLElement).style.background = "#f8fafc";
                    }}
                    onMouseLeave={e => {
                      if (selected?.id !== t.id) (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 800, fontSize: 11,
                      }}>
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>/{t.slug}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.email}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.staff_count}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0f172a" }}>{t.order_count}</div>
                    <PlanBadge plan={t.plan} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: t.is_active ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.is_active ? "#10b981" : "#ef4444", display: "inline-block" }} />
                      {t.is_active ? "Active" : "Suspended"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Action panel */}
              {selected && (
                <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e0e7ff", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 800, fontSize: 15,
                      }}>
                        {selected.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#0f172a" }}>{selected.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {selected.email} · Joined {new Date(selected.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelected(null)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
                    >
                      <X style={{ width: 16, height: 16 }} />
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>Change Plan:</span>
                    {["free", "basic", "pro", "enterprise"].map(plan => (
                      <button
                        key={plan}
                        onClick={() => changePlan(selected, plan)}
                        disabled={actionLoading || selected.plan === plan}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: "none",
                          fontWeight: 600, fontSize: 12, cursor: "pointer",
                          background: selected.plan === plan ? "#6366f1" : "#eff6ff",
                          color: selected.plan === plan ? "#fff" : "#6366f1",
                          opacity: actionLoading ? 0.6 : 1,
                          textTransform: "capitalize",
                        }}
                      >
                        {selected.plan === plan ? `✓ ${plan}` : plan}
                      </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button
                      onClick={() => toggleStatus(selected)}
                      disabled={actionLoading}
                      style={{
                        padding: "7px 16px", borderRadius: 8, border: "none",
                        fontWeight: 600, fontSize: 12, cursor: "pointer",
                        background: selected.is_active ? "#fef2f2" : "#f0fdf4",
                        color: selected.is_active ? "#ef4444" : "#16a34a",
                        opacity: actionLoading ? 0.6 : 1,
                        display: "flex", alignItems: "center", gap: 5,
                      }}
                    >
                      {selected.is_active
                        ? <><AlertTriangle style={{ width: 12, height: 12 }} /> Suspend</>
                        : <><CheckCircle2 style={{ width: 12, height: 12 }} /> Activate</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── STAFF ── */}
          {tab === "staff" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h2 style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#0f172a" }}>
                All Staff ({allStaff.length})
              </h2>
              <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #f1f5f9", overflow: "hidden" }}>
                <div style={{
                  display: "grid", gridTemplateColumns: "2fr 1.5fr 120px 100px",
                  padding: "10px 16px", background: "#f8fafc",
                  borderBottom: "1px solid #f1f5f9",
                  fontSize: 10, fontWeight: 700, color: "#94a3b8",
                  textTransform: "uppercase", letterSpacing: 0.5,
                }}>
                  <span>Staff Member</span>
                  <span>Business</span>
                  <span>Role</span>
                  <span>Status</span>
                </div>
                {allStaff.length === 0 && (
                  <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No staff yet.</div>
                )}
                {allStaff.map((s, i) => (
                  <div
                    key={s.id}
                    style={{
                      display: "grid", gridTemplateColumns: "2fr 1.5fr 120px 100px",
                      padding: "11px 16px", alignItems: "center",
                      borderBottom: i < allStaff.length - 1 ? "1px solid #f8fafc" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: "50%",
                        background: "#eef2ff",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#6366f1", fontWeight: 800, fontSize: 11,
                      }}>
                        {(s.full_name ?? s.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                          {s.full_name ?? "(no name)"}
                        </div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>{s.email}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      {(s.tenants as any)?.name ?? "—"}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px",
                      borderRadius: 99, background: "#f1f5f9", color: "#475569",
                      textTransform: "uppercase", display: "inline-block",
                    }}>
                      {s.role}
                    </span>
                    <div style={{ fontSize: 11, fontWeight: 600, color: s.is_active ? "#10b981" : "#ef4444" }}>
                      {s.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LICENSES ── */}
          {tab === "licenses" && (
            <div>
              <h2
                style={{
                  margin: "0 0 16px",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#0f172a",
                }}
              >
                Licenses
              </h2>
              <LicenseManager adminId={user.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}