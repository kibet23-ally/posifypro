// src/routes/pricing.tsx
// Public pricing page + license activation
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { toast } from "sonner";
import { Check, Zap, Shield, Crown, Key, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 4999,
    icon: Zap,
    color: "#3b82f6",
    bg: "#eff6ff",
    description: "Perfect for small shops just getting started",
    features: [
      "Up to 3 staff accounts",
      "Up to 100 products",
      "500 orders per month",
      "M-Pesa & Cash payments",
      "Basic sales reports",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: 9999,
    icon: Shield,
    color: "#6366f1",
    bg: "#f5f3ff",
    popular: true,
    description: "For growing businesses that need more power",
    features: [
      "Up to 10 staff accounts",
      "Unlimited products",
      "Unlimited orders",
      "All payment methods",
      "Advanced reports & analytics",
      "Customer management",
      "Staff management",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 24999,
    icon: Crown,
    color: "#f59e0b",
    bg: "#fffbeb",
    description: "Full power for large businesses",
    features: [
      "Unlimited staff accounts",
      "Unlimited products & orders",
      "All payment methods",
      "Full analytics suite",
      "Multi-branch ready",
      "Custom receipts",
      "API access",
      "Dedicated support",
    ],
  },
];

function fmtKES(n: number) {
  return `KES ${n.toLocaleString()}`;
}

export default function PricingPage() {
  const { user } = useAuth();
  const { tenantId, org } = useOrg();
  const navigate = useNavigate();
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  const currentPlan = org?.license_plan ?? org?.plan ?? "trial";

  const activateLicense = async () => {
    if (!licenseKey.trim()) { toast.error("Enter your license key"); return; }
    if (!tenantId) { toast.error("Please sign in first"); return; }

    setActivating(true);
    try {
      const { data, error } = await supabase.rpc("activate_license", {
        p_key: licenseKey.trim().toUpperCase(),
        p_tenant_id: tenantId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      setActivated(true);
      toast.success(`🎉 ${data.message}`);

      // Reload after 2s to reflect new plan
      setTimeout(() => navigate({ to: "/dashboard" }), 2000);
    } catch (err: any) {
      toast.error(err.message ?? "Activation failed");
    } finally {
      setActivating(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f8fafc 0%, #f0f0ff 50%, #faf5ff 100%)",
      fontFamily: "'DM Sans', system-ui, sans-serif",
      padding: "0 16px 60px",
    }}>

      {/* Nav */}
      <div style={{
        maxWidth: "1100px", margin: "0 auto", padding: "20px 0",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <div style={{ background: "#6366f1", borderRadius: "8px", padding: "6px 10px" }}>
            <span style={{ color: "#fff", fontWeight: "800", fontSize: "14px" }}>⚡ PosifyPro</span>
          </div>
        </Link>
        <div style={{ display: "flex", gap: "10px" }}>
          {user ? (
            <Link to="/dashboard">
              <Button size="sm" variant="outline">Dashboard</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "40px 0 48px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: "99px", padding: "4px 14px", fontSize: "12px",
            fontWeight: "600", color: "#16a34a", marginBottom: "16px",
          }}>
            ✅ One-time payment · No subscriptions · Lifetime license
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 48px)", fontWeight: "900",
            color: "#0f172a", letterSpacing: "-1px", margin: "0 0 12px",
          }}>
            Own it forever.<br />
            <span style={{ color: "#6366f1" }}>Pay once.</span>
          </h1>
          <p style={{ color: "#64748b", fontSize: "16px", maxWidth: "480px", margin: "0 auto" }}>
            No monthly fees. No surprises. Buy a license and use PosifyPro for life.
          </p>
        </div>

        {/* Current plan banner */}
        {user && currentPlan !== "trial" && (
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: "14px", padding: "16px 20px", marginBottom: "28px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "10px",
          }}>
            <div style={{ color: "#fff" }}>
              <div style={{ fontWeight: "700", fontSize: "14px" }}>
                ✅ You have an active license
              </div>
              <div style={{ fontSize: "12px", opacity: 0.8, marginTop: "2px" }}>
                Current plan: <strong style={{ textTransform: "capitalize" }}>{currentPlan}</strong>
              </div>
            </div>
            <Link to="/dashboard">
              <Button size="sm" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)" }}>
                Go to Dashboard <ArrowRight style={{ width: "14px", height: "14px", marginLeft: "4px" }} />
              </Button>
            </Link>
          </div>
        )}

        {/* Plan cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px", marginBottom: "48px",
        }}>
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.id;
            return (
              <div key={plan.id} style={{
                background: "#fff",
                borderRadius: "18px",
                padding: "28px 24px",
                border: plan.popular ? `2px solid ${plan.color}` : "1px solid #e2e8f0",
                boxShadow: plan.popular ? `0 8px 32px ${plan.color}20` : "0 2px 8px rgba(0,0,0,0.06)",
                position: "relative",
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = ""}
              >
                {plan.popular && (
                  <div style={{
                    position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)",
                    background: plan.color, color: "#fff", fontSize: "11px", fontWeight: "800",
                    padding: "3px 14px", borderRadius: "99px", whiteSpace: "nowrap", letterSpacing: "0.5px",
                  }}>MOST POPULAR</div>
                )}
                {isCurrent && (
                  <div style={{
                    position: "absolute", top: "12px", right: "12px",
                    background: "#f0fdf4", color: "#16a34a", fontSize: "10px",
                    fontWeight: "700", padding: "2px 8px", borderRadius: "99px",
                  }}>✓ ACTIVE</div>
                )}

                {/* Icon + name */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ background: plan.bg, borderRadius: "10px", padding: "8px" }}>
                    <Icon style={{ width: "20px", height: "20px", color: plan.color }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: "800", fontSize: "16px", color: "#0f172a" }}>{plan.name}</div>
                    <div style={{ fontSize: "11px", color: "#94a3b8" }}>{plan.description}</div>
                  </div>
                </div>

                {/* Price */}
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                    <span style={{ fontSize: "36px", fontWeight: "900", color: "#0f172a", letterSpacing: "-1px" }}>
                      {fmtKES(plan.price)}
                    </span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "2px" }}>
                    One-time payment · Lifetime license
                  </div>
                </div>

                {/* Features */}
                <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{
                        width: "16px", height: "16px", borderRadius: "50%",
                        background: `${plan.color}15`, display: "flex",
                        alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "1px",
                      }}>
                        <Check style={{ width: "10px", height: "10px", color: plan.color }} />
                      </div>
                      <span style={{ fontSize: "13px", color: "#374151" }}>{f}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a href="https://wa.me/254700000000?text=Hi%2C%20I%20want%20to%20buy%20a%20PosifyPro%20" + plan.name + "%20license"
                  target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <button style={{
                    width: "100%", padding: "12px", borderRadius: "10px", border: "none",
                    background: isCurrent ? "#f1f5f9" : plan.popular ? plan.color : `${plan.color}15`,
                    color: isCurrent ? "#94a3b8" : plan.popular ? "#fff" : plan.color,
                    fontWeight: "700", fontSize: "14px", cursor: isCurrent ? "default" : "pointer",
                    transition: "opacity 0.2s",
                  }}>
                    {isCurrent ? "✓ Current Plan" : `Buy ${plan.name} — ${fmtKES(plan.price)}`}
                  </button>
                </a>
              </div>
            );
          })}
        </div>

        {/* License activation box */}
        <Card style={{ padding: "28px", maxWidth: "520px", margin: "0 auto 40px", borderRadius: "18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
            <div style={{ background: "#f0fdf4", borderRadius: "8px", padding: "7px" }}>
              <Key style={{ width: "18px", height: "18px", color: "#16a34a" }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>
                Activate Your License
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>
                Enter the key you received after payment
              </p>
            </div>
          </div>

          {activated ? (
            <div style={{
              textAlign: "center", padding: "20px",
              background: "#f0fdf4", borderRadius: "12px", marginTop: "16px",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "8px" }}>🎉</div>
              <div style={{ fontWeight: "700", color: "#16a34a", fontSize: "15px" }}>License Activated!</div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>Redirecting to dashboard…</div>
            </div>
          ) : (
            <>
              <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
                <Input
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value.toUpperCase())}
                  placeholder="POSIFY-XXXX-XXXX-XXXX"
                  style={{ fontFamily: "monospace", letterSpacing: "1px", fontSize: "14px" }}
                  onKeyDown={e => e.key === "Enter" && activateLicense()}
                />
                <Button onClick={activateLicense} disabled={activating || !licenseKey.trim()}>
                  {activating ? "…" : "Activate"}
                </Button>
              </div>
              {!user && (
                <div style={{
                  marginTop: "12px", display: "flex", alignItems: "center", gap: "6px",
                  padding: "10px 14px", background: "#fef9c3", borderRadius: "8px",
                  fontSize: "12px", color: "#92400e",
                }}>
                  <Lock style={{ width: "12px", height: "12px" }} />
                  <span>You need to <Link to="/login" style={{ fontWeight: "600", color: "#6366f1" }}>sign in</Link> to activate a license</span>
                </div>
              )}
              <div style={{ marginTop: "12px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
                Purchased via M-Pesa or bank transfer? Your license key will be sent to your email within minutes.
              </div>
            </>
          )}
        </Card>

        {/* FAQ */}
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontWeight: "800", fontSize: "22px", color: "#0f172a", marginBottom: "20px" }}>
            Frequently Asked Questions
          </h2>
          {[
            {
              q: "Is this really a one-time payment?",
              a: "Yes! Pay once and use PosifyPro forever. No monthly fees, no renewals.",
            },
            {
              q: "How do I pay?",
              a: "We accept M-Pesa (Till/Paybill), bank transfer, and card. After payment, your license key is sent to your email within minutes.",
            },
            {
              q: "Can I upgrade my plan later?",
              a: "Yes. You pay the difference between your current plan and the new one.",
            },
            {
              q: "What if I need help?",
              a: "All plans include support via WhatsApp and email. Enterprise customers get dedicated support.",
            },
            {
              q: "Can I use one license on multiple devices?",
              a: "Yes — your license is tied to your business account, not a device. Access from any browser.",
            },
          ].map((faq, i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: "12px", padding: "16px 20px",
              marginBottom: "8px", border: "1px solid #f1f5f9",
            }}>
              <div style={{ fontWeight: "600", fontSize: "13px", color: "#0f172a", marginBottom: "6px" }}>
                {faq.q}
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
