import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const qc = useQueryClient();
  const { data: s } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").limit(1).maybeSingle()).data,
  });

  const [form, setForm] = useState({
    business_name: "", business_phone: "", address: "", kra_pin: "",
    currency: "KES", currency_symbol: "KSh", tax_rate: 16, receipt_footer: "Thank you for your business!",
  });

  useEffect(() => {
    if (s) setForm({
      business_name: s.business_name || "", business_phone: s.business_phone || "", address: s.address || "",
      kra_pin: s.kra_pin || "", currency: s.currency || "KES", currency_symbol: s.currency_symbol || "KSh",
      tax_rate: Number(s.tax_rate ?? 16), receipt_footer: s.receipt_footer || "",
    });
  }, [s]);

  const save = async () => {
    if (!s) { await supabase.from("settings").insert(form); }
    else { await supabase.from("settings").update(form).eq("id", s.id); }
    toast.success("Settings saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Customize your shop and receipts.</p>
      </div>
      <Card className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Label>Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.business_phone} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} /></div>
          <div><Label>KRA PIN</Label><Input value={form.kra_pin} onChange={(e) => setForm({ ...form, kra_pin: e.target.value })} /></div>
          <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
          <div><Label>Currency code</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
          <div><Label>Currency symbol</Label><Input value={form.currency_symbol} onChange={(e) => setForm({ ...form, currency_symbol: e.target.value })} /></div>
          <div className="col-span-2"><Label>Tax rate (%)</Label><Input type="number" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: Number(e.target.value) })} /></div>
          <div className="col-span-2"><Label>Receipt footer</Label><Textarea value={form.receipt_footer} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} /></div>
        </div>
        <Button onClick={save}>Save settings</Button>
      </Card>
    </div>
  );
}
