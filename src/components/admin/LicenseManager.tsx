// src/components/admin/LicenseManager.tsx
// License-key management is not yet wired into the current schema.
// This is a placeholder to keep the SuperAdminDashboard "Licenses" tab compiling.
import { Key } from "lucide-react";

export default function LicenseManager(_props: { adminId: string }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        border: "1px solid #f1f5f9",
        padding: "60px 24px",
        textAlign: "center",
      }}
    >
      <Key style={{ width: "44px", height: "44px", margin: "0 auto 12px", color: "#cbd5e1" }} />
      <h2 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "#0f172a" }}>
        License Keys — Coming Soon
      </h2>
      <p style={{ margin: 0, fontSize: "13px", color: "#94a3b8", maxWidth: "420px", marginInline: "auto" }}>
        License-key issuance and activation will be available here once the billing flow is enabled.
        Meanwhile, manage each business's plan directly from the Businesses tab.
      </p>
    </div>
  );
}
