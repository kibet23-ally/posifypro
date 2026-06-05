// src/components/LicenseGuard.tsx
// Wraps protected pages — shows paywall if no active license
import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useOrg } from "@/hooks/use-org";
import { Button } from "@/components/ui/button";
import { Lock, Key, ArrowRight, Zap } from "lucide-react";

interface Props {
  children: ReactNode;
  // Pages that are always accessible regardless of license
  bypass?: boolean;
}

export default function LicenseGuard({ children, bypass = false }: Props) {
  const { org, loading } = useOrg();

  if (loading) return null;
  if (bypass) return <>{children}</>;

  // Trial mode — show a banner but still allow access
  const isTrial = !org?.license_plan || org.license_plan === "trial";
  const isExpired = org?.is_active === false;

  // Completely blocked
  if (isExpired) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "24px",
        background: "linear-gradient(135deg, #f8fafc, #f0f0ff)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>
        <div style={{ maxWidth: "420px", textAlign: "center" }}>
          <div style={{
            width: "64px", height: "64px", borderRadius: "18px",
            background: "#fee2e2", display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 20px",
          }}>
            <Lock style={{ width: "28px", height: "28px", color: "#ef4444" }} />
          </div>
          <h2 style={{ fontWeight: "800", fontSize: "22px", color: "#0f172a", margin: "0 0 8px" }}>
            Account Suspended
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
            Your account has been suspended. Please contact support or purchase a license to restore access.
          </p>
          <Link to="/pricing">
            <Button className="gap-2 w-full">
              <Key className="size-4" /> View Licensing Options
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Trial banner */}
      {isTrial && (
        <div style={{
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: "8px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Zap style={{ width: "14px", height: "14px", color: "#fff" }} />
            <span style={{ color: "#fff", fontSize: "13px", fontWeight: "500" }}>
              You're on a <strong>free trial</strong> — some features may be limited.
            </span>
          </div>
          <Link to="/pricing">
            <button style={{
              background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)",
              borderRadius: "8px", padding: "5px 14px", color: "#fff",
              fontSize: "12px", fontWeight: "600", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "4px",
            }}>
              Upgrade <ArrowRight style={{ width: "12px", height: "12px" }} />
            </button>
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
