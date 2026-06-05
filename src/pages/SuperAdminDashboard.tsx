// src/pages/SuperAdminDashboard.tsx
// Lightweight super-admin view backed by the actual `organizations` schema.
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import LicenseManager from "@/components/admin/LicenseManager";
import {
  LayoutDashboard, Building2, Users, LogOut, RefreshCw, Search, Key, Shield,
} from "lucide-react";

type AdminTab = "overview" | "organizations" | "staff" | "licenses";

interface Org {
  id: string;
  name: string;
  owner_id: string;
  license_status: string;
  license_expires_at: string | null;
  created_at: string;
  staff_count?: number;
  sales_count?: number;
}

interface Staff {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  org_id: string | null;
  organizations?: { name: string } | null;
}

const STATUS_COLORS: Record<string, { c: string; bg: string }> = {
  trial:    { c: "#3b82f6", bg: "#eff6ff" },
  active:   { c: "#16a34a", bg: "#f0fdf4" },
  lifetime: { c: "#8b5cf6", bg: "#f5f3ff" },
  expired:  { c: "#ef4444", bg: "#fef2f2" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.trial;
  return (
    <span style={{
      background: c.bg, color: c.c, padding: "2px 9px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, textTransform: "uppercase",
      border: `1px solid ${c.c}30`,
    }}>{status}</span>
  );
}

function KCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #f1f5f9" }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => {
      if (data?.role !== "super_admin") navigate({ to: "/dashboard" });
    });
  }, [user, navigate]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: or } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });
      if (!or) return;

      const enriched: Org[] = await Promise.all(
        (or as any[]).map(async (o) => {
          const [sr, sales] = await Promise.all([
            supabase.from("profiles").select("id", { count: "exact", head: true }).eq("org_id", o.id),
            supabase.from("sales").select("id", { count: "exact", head: true }).eq("org_id", o.id),
          ]);
          return { ...o, staff_count: sr.count ?? 0, sales_count: sales.count ?? 0 };
        })
      );
      setOrgs(enriched);

      const { data: sd } = await supabase
        .from("profiles")
        .select("id, name, email, role, org_id, organizations(name)")
        .neq("role", "super_admin")
        .order("created_at", { ascending: false });
      setStaff((sd ?? []) as unknown as Staff[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = orgs.filter((o) => {
    const q = search.toLowerCase();
    return !q || o.name.toLowerCase().includes(q);
  });

  const totals = {
    orgs: orgs.length,
    active: orgs.filter(o => o.license_status === "active" || o.license_status === "lifetime").length,
    trial: orgs.filter(o => o.license_status === "trial").length,
    staff: staff.length,
  };

  if (!user) {
    return <div style={{ padding: 24 }}>Sign in required.</div>;
  }

  const NAV: { id: AdminTab; label: string; icon: any }[] = [
    { id: "overview",      label: "Overview",      icon: LayoutDashboard },
    { id: "organizations", label: "Organizations", icon: Building2 },
    { id: "staff",         label: "Staff",         icon: Users },
    { id: "licenses",      label: "Licenses",      icon: Key },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div style={{
        background: "#0f172a", color: "#fff", padding: "14px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Shield style={{ width: 18, height: 18, color: "#a5b4fc" }} />
          <strong>Super Admin</strong>
          <span style={{ color: "#64748b", fontSize: 12 }}>· PosifyPro</span>
        </div>
        <button onClick={() => signOut()} style={{
          background: "transparent", color: "#fff", border: "1px solid #334155",
          padding: "6px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <LogOut style={{ width: 14, height: 14 }} /> Sign out
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "calc(100vh - 52px)" }}>
        {/* Sidebar */}
        <aside style={{ background: "#fff", borderRight: "1px solid #e2e8f0", padding: 12 }}>
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                style={{
                  width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8,
                  background: active ? "#eef2ff" : "transparent",
                  color: active ? "#4338ca" : "#475569",
                  border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
                }}
              >
                <n.icon style={{ width: 16, height: 16 }} /> {n.label}
              </button>
            );
          })}
        </aside>

        {/* Main */}
        <main style={{ padding: 20 }}>
          {tab === "overview" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#0f172a" }}>Overview</h1>
                <button onClick={load} disabled={refreshing} style={{
                  background: "#fff", border: "1px solid #e2e8f0", padding: "6px 12px",
                  borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13,
                }}>
                  <RefreshCw style={{ width: 14, height: 14 }} /> Refresh
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <KCard label="Total Organizations" value={totals.orgs} />
                <KCard label="Active / Lifetime"  value={totals.active} />
                <KCard label="On Trial"           value={totals.trial} />
                <KCard label="Staff Accounts"     value={totals.staff} />
              </div>
              {loading && <p style={{ marginTop: 16, color: "#64748b" }}>Loading…</p>}
            </>
          )}

          {tab === "organizations" && (
            <>
              <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800 }}>Organizations</h1>
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search style={{ width: 16, height: 16, position: "absolute", left: 10, top: 10, color: "#94a3b8" }} />
                <input
                  placeholder="Search organizations…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
                    border: "1px solid #e2e8f0", fontSize: 14, outline: "none",
                  }}
                />
              </div>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {filtered.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>
                    No organizations yet.
                  </div>
                )}
                {filtered.map((o) => (
                  <div key={o.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 12,
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{o.name}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {o.staff_count ?? 0} staff · {o.sales_count ?? 0} sales · joined {new Date(o.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <StatusBadge status={o.license_status} />
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "staff" && (
            <>
              <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800 }}>All Staff</h1>
              <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                {staff.length === 0 && (
                  <div style={{ padding: 24, textAlign: "center", color: "#94a3b8" }}>No staff yet.</div>
                )}
                {staff.map((s) => (
                  <div key={s.id} style={{
                    display: "flex", alignItems: "center", gap: 12, padding: 12,
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{s.name ?? "(no name)"}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {s.email} · {s.organizations?.name ?? "—"}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 8px",
                      borderRadius: 99, background: "#f1f5f9", color: "#475569",
                      textTransform: "uppercase",
                    }}>
                      {s.role}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {tab === "licenses" && (
            <>
              <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 800 }}>Licenses</h1>
              <LicenseManager adminId={user.id} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
