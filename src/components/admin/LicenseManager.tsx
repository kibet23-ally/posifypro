// src/components/admin/LicenseManager.tsx
// Used inside SuperAdminDashboard as the "Licenses" tab
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key, Plus, Copy, Check, Search,
  CheckCircle2, XCircle, Clock, AlertTriangle,
} from "lucide-react";

interface LicenseKey {
  id: string;
  key: string;
  plan: string;
  status: string;
  price_paid: number;
  currency: string;
  payment_ref?: string;
  notes?: string;
  activated_at?: string;
  created_at: string;
  tenant_id?: string;
  tenants?: { name: string };
}

const PLAN_CFG: Record<string, { color: string; bg: string }> = {
  starter:      { color: "#3b82f6", bg: "#eff6ff" },
  professional: { color: "#6366f1", bg: "#f5f3ff" },
  enterprise:   { color: "#f59e0b", bg: "#fffbeb" },
};

const STATUS_CFG: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  unused:    { color: "#64748b", bg: "#f1f5f9", icon: Clock,         label: "Unused"    },
  active:    { color: "#16a34a", bg: "#f0fdf4", icon: CheckCircle2,  label: "Active"    },
  suspended: { color: "#ef4444", bg: "#fef2f2", icon: XCircle,       label: "Suspended" },
  expired:   { color: "#f59e0b", bg: "#fffbeb", icon: AlertTriangle, label: "Expired"   },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => {
      await navigator.clipboard.writeText(text);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }} style={{
      display: "inline-flex", alignItems: "center", gap: "3px",
      background: "none", border: "none", cursor: "pointer",
      color: copied ? "#16a34a" : "#6366f1", fontSize: "11px", fontWeight: "600", padding: "2px 4px",
    }}>
      {copied ? <Check style={{ width: "12px", height: "12px" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function LicenseManager({ adminId }: { adminId: string }) {
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    plan: "professional",
    price: 9999,
    currency: "KES",
    payment_ref: "",
    notes: "",
    count: 1,
  });

  const fetchKeys = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("license_keys")
      .select("*, tenants(name)")
      .order("created_at", { ascending: false });
    setKeys(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchKeys(); }, []);

  const generateKeys = async () => {
    setGenerating(true);
    try {
      const generated: string[] = [];
      for (let i = 0; i < form.count; i++) {
        const { data, error } = await supabase.rpc("generate_license_key", {
          p_plan: form.plan,
          p_price: form.price,
          p_currency: form.currency,
          p_notes: form.notes || null,
          p_issued_by: adminId,
        });
        if (error) throw error;
        generated.push(data);
      }
      toast.success(`${generated.length} license key${generated.length > 1 ? "s" : ""} generated!`);
      setShowForm(false);
      await fetchKeys();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to generate key");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSuspend = async (k: LicenseKey) => {
    const newStatus = k.status === "suspended" ? "active" : "suspended";
    const { error } = await supabase
      .from("license_keys")
      .update({ status: newStatus })
      .eq("id", k.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newStatus === "suspended" ? "License suspended" : "License reactivated");
    await fetchKeys();
  };

  const filtered = keys.filter(k => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      k.key.toLowerCase().includes(q) ||
      (k.tenants?.name ?? "").toLowerCase().includes(q) ||
      (k.payment_ref ?? "").toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || k.status === filterStatus;
    const matchPlan = filterPlan === "all" || k.plan === filterPlan;
    return matchSearch && matchStatus && matchPlan;
  });

  const stats = {
    total: keys.length,
    active: keys.filter(k => k.status === "active").length,
    unused: keys.filter(k => k.status === "unused").length,
    revenue: keys.filter(k => k.status === "active").reduce((s, k) => s + Number(k.price_paid ?? 0), 0),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ margin: 0, fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>License Keys</h2>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#94a3b8" }}>Generate and manage one-time license keys</p>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "#6366f1", color: "#fff", border: "none",
          borderRadius: "9px", padding: "9px 16px", fontWeight: "600",
          fontSize: "13px", cursor: "pointer",
        }}>
          <Plus style={{ width: "14px", height: "14px" }} /> Generate Keys
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
        {[
          { label: "Total Keys",    value: stats.total,   color: "#6366f1" },
          { label: "Active",        value: stats.active,  color: "#10b981" },
          { label: "Unused",        value: stats.unused,  color: "#f59e0b" },
          { label: "Total Revenue", value: `KES ${stats.revenue.toLocaleString()}`, color: "#3b82f6" },
        ].map(s => (
          <div key={s.label} style={{
            background: "#fff", borderRadius: "12px", padding: "14px 16px",
            border: "1px solid #f1f5f9",
          }}>
            <div style={{ fontSize: "20px", fontWeight: "800", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Generate form */}
      {showForm && (
        <div style={{
          background: "#fff", borderRadius: "14px", padding: "20px",
          border: "1px solid #e0e7ff", boxShadow: "0 4px 20px rgba(99,102,241,0.08)",
        }}>
          <h3 style={{ margin: "0 0 14px", fontWeight: "700", fontSize: "14px", color: "#0f172a" }}>
            Generate License Key(s)
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
            <div>
              <Label style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Plan</Label>
              <select value={form.plan} onChange={e => {
                const prices: Record<string, number> = { starter: 4999, professional: 9999, enterprise: 24999 };
                setForm(f => ({ ...f, plan: e.target.value, price: prices[e.target.value] ?? f.price }));
              }} style={{
                width: "100%", padding: "8px 10px", borderRadius: "8px",
                border: "1.5px solid #e2e8f0", fontSize: "13px", background: "#fff",
              }}>
                <option value="starter">Starter — KES 4,999</option>
                <option value="professional">Professional — KES 9,999</option>
                <option value="enterprise">Enterprise — KES 24,999</option>
              </select>
            </div>
            <div>
              <Label style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Price Paid (KES)</Label>
              <Input type="number" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                style={{ fontSize: "13px" }} />
            </div>
            <div>
              <Label style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Payment Ref</Label>
              <Input placeholder="M-Pesa code, bank ref…" value={form.payment_ref}
                onChange={e => setForm(f => ({ ...f, payment_ref: e.target.value }))}
                style={{ fontSize: "13px" }} />
            </div>
            <div>
              <Label style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Quantity</Label>
              <Input type="number" min="1" max="20" value={form.count}
                onChange={e => setForm(f => ({ ...f, count: Math.min(20, Number(e.target.value)) }))}
                style={{ fontSize: "13px" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <Label style={{ fontSize: "12px", marginBottom: "4px", display: "block" }}>Notes (optional)</Label>
              <Input placeholder="Customer name, order details…" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                style={{ fontSize: "13px" }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            <button onClick={() => setShowForm(false)} style={{
              padding: "9px 16px", borderRadius: "8px", border: "1.5px solid #e2e8f0",
              background: "#fff", color: "#64748b", fontWeight: "600", fontSize: "13px", cursor: "pointer",
            }}>Cancel</button>
            <button onClick={generateKeys} disabled={generating} style={{
              padding: "9px 20px", borderRadius: "8px", border: "none",
              background: "#6366f1", color: "#fff", fontWeight: "600", fontSize: "13px",
              cursor: generating ? "not-allowed" : "pointer", opacity: generating ? 0.7 : 1,
              display: "flex", alignItems: "center", gap: "6px",
            }}>
              <Key style={{ width: "14px", height: "14px" }} />
              {generating ? "Generating…" : `Generate ${form.count} Key${form.count > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "180px" }}>
          <Search style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", width: "13px", height: "13px", color: "#94a3b8" }} />
          <input placeholder="Search keys, business, ref…" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", padding: "7px 10px 7px 30px", borderRadius: "8px", border: "1.5px solid #e2e8f0", fontSize: "12px", outline: "none", boxSizing: "border-box" }}
            onFocus={e => e.target.style.borderColor = "#6366f1"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
        </div>
        {(["all", "unused", "active", "suspended"] as const).map(s => (
          <button key={s} onClick={() => setFilterStatus(s)} style={{
            padding: "6px 12px", borderRadius: "99px", border: "1.5px solid",
            borderColor: filterStatus === s ? "#6366f1" : "#e2e8f0",
            background: filterStatus === s ? "#6366f1" : "#fff",
            color: filterStatus === s ? "#fff" : "#64748b",
            fontSize: "11px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
          }}>{s === "all" ? "All Status" : s}</button>
        ))}
        {(["all", "starter", "professional", "enterprise"] as const).map(p => (
          <button key={p} onClick={() => setFilterPlan(p)} style={{
            padding: "6px 12px", borderRadius: "99px", border: "1.5px solid",
            borderColor: filterPlan === p ? "#0f172a" : "#e2e8f0",
            background: filterPlan === p ? "#0f172a" : "#fff",
            color: filterPlan === p ? "#fff" : "#64748b",
            fontSize: "11px", fontWeight: "600", cursor: "pointer", textTransform: "capitalize",
          }}>{p === "all" ? "All Plans" : p}</button>
        ))}
        <span style={{ fontSize: "11px", color: "#94a3b8", marginLeft: "auto" }}>
          {filtered.length} keys
        </span>
      </div>

      {/* Keys table */}
      <div style={{ background: "#fff", borderRadius: "14px", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 80px",
          padding: "10px 16px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9",
          fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px",
        }}>
          <span>Key</span><span>Plan</span><span>Status</span><span>Price</span><span>Business</span><span></span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "50px", textAlign: "center", color: "#94a3b8" }}>
            <Key style={{ width: "36px", height: "36px", margin: "0 auto 10px", opacity: 0.2 }} />
            <p style={{ margin: 0 }}>No license keys yet</p>
          </div>
        ) : (
          filtered.map((k, i) => {
            const planCfg = PLAN_CFG[k.plan] ?? PLAN_CFG.professional;
            const statusCfg = STATUS_CFG[k.status] ?? STATUS_CFG.unused;
            const StatusIcon = statusCfg.icon;
            return (
              <div key={k.id} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 80px",
                padding: "12px 16px", alignItems: "center",
                borderBottom: i < filtered.length - 1 ? "1px solid #f8fafc" : "none",
                transition: "background 0.1s",
              }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#f8fafc"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <code style={{ fontSize: "12px", fontWeight: "700", color: "#0f172a", letterSpacing: "1px" }}>
                      {k.key}
                    </code>
                    <CopyButton text={k.key} />
                  </div>
                  {k.notes && <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>{k.notes}</div>}
                  {k.activated_at && (
                    <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                      Activated {new Date(k.activated_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <span style={{
                  background: planCfg.bg, color: planCfg.color,
                  padding: "2px 8px", borderRadius: "99px", fontSize: "10px", fontWeight: "700",
                  textTransform: "capitalize", display: "inline-block",
                }}>{k.plan}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "600", color: statusCfg.color }}>
                  <StatusIcon style={{ width: "11px", height: "11px" }} />
                  {statusCfg.label}
                </div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: "#0f172a" }}>
                  KES {Number(k.price_paid ?? 0).toLocaleString()}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>
                  {(k.tenants as any)?.name ?? (k.status === "unused" ? "—" : "Unknown")}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  {(k.status === "active" || k.status === "suspended") && (
                    <button onClick={() => toggleSuspend(k)} style={{
                      padding: "4px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                      background: k.status === "suspended" ? "#f0fdf4" : "#fef2f2",
                      color: k.status === "suspended" ? "#16a34a" : "#ef4444",
                      fontSize: "11px", fontWeight: "600",
                    }}>
                      {k.status === "suspended" ? "Restore" : "Suspend"}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
