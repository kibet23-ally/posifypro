// src/components/admin/LicenseManager.tsx
// Placeholder — the license-key system isn't wired up to the current schema yet.
import { Card } from "@/components/ui/card";
import { Key } from "lucide-react";

export default function LicenseManager(_: { adminId: string }) {
  return (
    <Card style={{ padding: "32px", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: "#eef2ff",
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 16px",
      }}>
        <Key style={{ width: 24, height: 24, color: "#6366f1" }} />
      </div>
      <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
        License keys coming soon
      </h3>
      <p style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>
        Issue and manage license keys for tenants once the billing schema is enabled.
      </p>
    </Card>
  );
}
