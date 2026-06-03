// src/routes/_app.products.tsx
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
import { Plus, Pencil, Trash2, Search, Package } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type Form = {
  id?: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;   // ← was "stock" in old schema
  category_name: string;
  emoji: string;
  barcode: string;
  low_stock_threshold: number;
  sku: string;
};

const empty: Form = {
  name: "", price: 0, cost_price: 0, stock_quantity: 0,
  category_name: "", emoji: "📦", barcode: "", low_stock_threshold: 10, sku: "",
};

function ProductsPage() {
  const qc = useQueryClient();
  const { tenantId } = useOrg();   // ← use tenantId not orgId
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", tenantId],
    enabled: !!tenantId,
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId!)   // ← scoped to tenant
        .eq("is_active", true)
        .order("name")
      ).data ?? [],
  });

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (form.price <= 0)   { toast.error("Price must be greater than 0"); return; }
    if (!tenantId)         { toast.error("No business found — please sign in again"); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price,
        cost_price: form.cost_price,
        stock_quantity: form.stock_quantity,   // ← correct column name
        low_stock_threshold: form.low_stock_threshold,
        sku: form.sku || null,
        barcode: form.barcode || null,
        is_active: true,
        tenant_id: tenantId,                   // ← tenant_id not org_id
      };

      const { error } = form.id
        ? await supabase.from("products").update(payload).eq("id", form.id)
        : await supabase.from("products").insert(payload);

      if (error) throw error;

      toast.success(form.id ? "Product updated" : "Product added!");
      setOpen(false);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["pos-products"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats-v2"] });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    // Soft delete — set is_active = false
    const { error } = await supabase
      .from("products").update({ is_active: false }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["pos-products"] });
  };

  const openEdit = (p: any) => {
    setForm({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      cost_price: Number(p.cost_price ?? 0),
      stock_quantity: p.stock_quantity ?? 0,
      category_name: p.category_name ?? "",
      emoji: p.emoji ?? "📦",
      barcode: p.barcode ?? "",
      sku: p.sku ?? "",
      low_stock_threshold: p.low_stock_threshold ?? 10,
    });
    setOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} item{products.length !== 1 ? "s" : ""} in your catalog
          </p>
        </div>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Add product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Bread, Milk..."
                />
              </div>
              <div>
                <Label>Emoji</Label>
                <Input
                  value={form.emoji}
                  onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={form.category_name}
                  onChange={(e) => setForm({ ...form, category_name: e.target.value })}
                  placeholder="e.g. Food, Drinks"
                />
              </div>
              <div>
                <Label>Price (KES) *</Label>
                <Input
                  type="number" min="0"
                  value={form.price || ""}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Cost price</Label>
                <Input
                  type="number" min="0"
                  value={form.cost_price || ""}
                  onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Stock quantity</Label>
                <Input
                  type="number" min="0"
                  value={form.stock_quantity || ""}
                  onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Low stock alert</Label>
                <Input
                  type="number" min="0"
                  value={form.low_stock_threshold || ""}
                  onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div>
                <Label>Barcode</Label>
                <Input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? "Saving…" : form.id ? "Update product" : "Add product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="py-16 text-center text-muted-foreground text-sm">Loading products…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b bg-muted/30">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3 hidden sm:table-cell">Category</th>
                <th className="text-right p-3">Price</th>
                <th className="text-right p-3">Stock</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-muted-foreground">
                    <Package className="size-10 mx-auto mb-2 opacity-20" />
                    <div>No products yet.</div>
                    <div className="text-xs mt-1">Click "Add product" to get started.</div>
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const lowStock = (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10);
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.emoji ?? "📦"}</span>
                        <div>
                          <div className="font-medium">{p.name}</div>
                          {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground hidden sm:table-cell">
                      {p.category_name || "—"}
                    </td>
                    <td className="p-3 text-right font-medium">{fmtMoney(Number(p.price))}</td>
                    <td className={`p-3 text-right font-medium ${lowStock ? "text-amber-500" : ""}`}>
                      {p.stock_quantity ?? 0}
                      {lowStock && <span className="ml-1 text-xs">⚠</span>}
                    </td>
                    <td className="p-3 text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => del(p.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
