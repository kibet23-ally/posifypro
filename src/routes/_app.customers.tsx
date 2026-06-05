// src/routes/_app.customers.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Search, Users, Phone, Mail, Star, Pencil, Trash2 } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/_app/customers")({ component: CustomersPage });

type Form = {
  id?: string;
  name: string;
  email: string;
  phone: string;
};
const empty: Form = { name: "", email: "", phone: "" };

function CustomersPage() {
  const qc = useQueryClient();
  const { tenantId } = useOrg();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", tenantId],
    enabled: !!tenantId,
    queryFn: async () =>
      (await supabase
        .from("customers")
        .select("*")
        .eq("org_id", tenantId!)
        .order("name")
      ).data ?? [],
  });

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !q || c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.toLowerCase().includes(q);
  });

  const save = async () => {
    if (!form.name.trim()) { toast.error("Customer name is required"); return; }
    if (!tenantId) { toast.error("No business found"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        org_id: tenantId,
      };
      const { error } = form.id
        ? await supabase.from("customers").update(payload).eq("id", form.id)
        : await supabase.from("customers").insert(payload);
      if (error) throw error;
      toast.success(form.id ? "Customer updated!" : "Customer added!");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["customers"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Customer deleted");
    qc.invalidateQueries({ queryKey: ["customers"] });
  };

  const topCustomers = [...customers]
    .sort((a, b) => Number(b.total_spent ?? 0) - Number(a.total_spent ?? 0))
    .slice(0, 3);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-sm text-muted-foreground">
            {customers.length} registered customer{customers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="size-4" /> Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Customer" : "Add Customer"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Jane Wanjiru" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+254 700 000 000" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jane@example.com" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Update" : "Add Customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Top customers */}
      {topCustomers.length > 0 && topCustomers.some(c => Number(c.total_spent) > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {topCustomers.map((c, i) => (
            <Card key={c.id} className="p-4 text-center">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm mx-auto mb-2">
                {c.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className="font-semibold text-sm truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{fmtMoney(Number(c.total_spent ?? 0))} spent</div>
              {i === 0 && <Star className="size-3 text-amber-400 mx-auto mt-1" />}
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, phone, email…" className="pl-9" />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <Users className="size-12 mx-auto mb-3 opacity-20" />
          <p>{search ? "No customers found" : "No customers yet"}</p>
          <p className="text-xs mt-1">Add customers to track their purchases and loyalty</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <Card key={c.id} className="p-4 flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary shrink-0">
                {c.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="flex flex-wrap gap-2 mt-0.5">
                  {c.phone && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" /> {c.phone}
                    </span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="size-3" /> {c.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold">{fmtMoney(Number(c.total_spent ?? 0))}</div>
                <div className="text-xs text-muted-foreground">
                  {c.loyalty_points ?? 0} pts
                </div>
              </div>
              <div className="flex gap-0.5 shrink-0">
                <Button size="icon" variant="ghost"
                  onClick={() => { setForm({ id: c.id, name: c.name, email: c.email ?? "", phone: c.phone ?? "" }); setOpen(true); }}>
                  <Pencil className="size-4" />
                </Button>
                <Button size="icon" variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => del(c.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
