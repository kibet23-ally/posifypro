// src/routes/_app.settings.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";
import { useAuth } from "@/hooks/use-auth";
import { Building2, User, Shield, LogOut } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

const CURRENCIES = ["KES", "USD", "UGX", "TZS", "NGN", "GHS", "ZAR", "GBP", "EUR"];
const TIMEZONES  = [
  { value: "Africa/Nairobi",       label: "Nairobi (EAT)"       },
  { value: "Africa/Lagos",         label: "Lagos (WAT)"         },
  { value: "Africa/Johannesburg",  label: "Johannesburg (SAST)" },
  { value: "Africa/Accra",         label: "Accra (GMT)"         },
  { value: "Europe/London",        label: "London (GMT/BST)"    },
  { value: "America/New_York",     label: "New York (EST)"      },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { tenantId, org } = useOrg();
  const { user, signOut } = useAuth();

  const [biz, setBiz] = useState({
    name: "", email: "", phone: "", address: "",
    currency: "KES", timezone: "Africa/Nairobi",
  });
  const [savingBiz, setSavingBiz] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  // Populate form when org loads
  useEffect(() => {
    if (org) {
      setBiz({
        name:     org.name     ?? "",
        email:    org.email    ?? "",
        phone:    org.phone    ?? "",
        address:  org.address  ?? "",
        currency: org.currency ?? "KES",
        timezone: org.timezone ?? "Africa/Nairobi",
      });
    }
  }, [org?.id]);

  const saveBusiness = async () => {
    if (!biz.name.trim()) { toast.error("Business name is required"); return; }
    if (!tenantId) { toast.error("No business found"); return; }
    setSavingBiz(true);
    try {
      const { error } = await supabase.from("organizations")
        .update({
          name:     biz.name.trim(),
          email:    biz.email || null,
          phone:    biz.phone || null,
          address:  biz.address || null,
          currency: biz.currency,
          timezone: biz.timezone,
        })
        .eq("id", tenantId);
      if (error) throw error;
      toast.success("Business settings saved!");
      qc.invalidateQueries({ queryKey: ["tenant"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSavingBiz(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSavingPwd(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated!");
      setNewPassword("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to update password");
    } finally {
      setSavingPwd(false);
    }
  };

  const bf = (key: keyof typeof biz) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setBiz(b => ({ ...b, [key]: e.target.value }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your store and account</p>
      </div>

      {/* Business Info */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="size-4 text-primary" />
          <h2 className="font-semibold">Business Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1.5">
            <Label>Business Name *</Label>
            <Input value={biz.name} onChange={bf("name")} placeholder="Your business name" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={biz.email} onChange={bf("email")} placeholder="business@email.com" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={biz.phone} onChange={bf("phone")} placeholder="+254 700 000 000" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Address</Label>
            <Input value={biz.address} onChange={bf("address")} placeholder="e.g. Tom Mboya St, Nairobi" />
          </div>
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <select value={biz.currency} onChange={bf("currency")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <select value={biz.timezone} onChange={bf("timezone")}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {TIMEZONES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={saveBusiness} disabled={savingBiz} className="w-full">
          {savingBiz ? "Saving…" : "Save Business Settings"}
        </Button>
      </Card>

      {/* Account */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <User className="size-4 text-primary" />
          <h2 className="font-semibold">Account</h2>
        </div>
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <div className="text-muted-foreground text-xs mb-0.5">Signed in as</div>
          <div className="font-medium">{user?.email}</div>
        </div>
        <div className="space-y-1.5">
          <Label>New Password</Label>
          <Input type="password" value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Min. 8 characters" />
        </div>
        <Button onClick={savePassword} disabled={savingPwd || newPassword.length === 0} variant="outline" className="w-full">
          {savingPwd ? "Updating…" : "Update Password"}
        </Button>
      </Card>

      {/* Plan info */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="size-4 text-primary" />
          <h2 className="font-semibold">Subscription</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium capitalize">{org?.plan ?? "Free"} Plan</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {org?.plan === "pro" ? "Full access — all features included"
                : org?.plan === "basic" ? "Basic features included"
                : "Limited features — upgrade to unlock more"}
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-full capitalize
            ${org?.plan === "pro" ? "bg-purple-100 text-purple-700"
              : org?.plan === "basic" ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600"}`}>
            {org?.plan ?? "free"}
          </span>
        </div>
      </Card>

      {/* Sign out */}
      <Button variant="destructive" className="w-full gap-2" onClick={async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }}>
        <LogOut className="size-4" /> Sign Out
      </Button>
    </div>
  );
}
