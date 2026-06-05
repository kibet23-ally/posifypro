// src/routes/_app.products.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Pencil, Trash2, Search, Package,
  AlertTriangle, ArrowUpDown, Filter,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type Form = {
  id?: string;
  name: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  category_name: string;
  emoji: string;
  barcode: string;
  sku: string;
  low_stock_threshold: number;
};

const empty: Form = {
  name: "", price: 0, cost_price: 0, stock_quantity: 0,
  category_name: "", emoji: "📦", barcode: "", sku: "", low_stock_threshold: 10,
};

function ProductsPage() {
  const qc = useQueryClient();
  const { tenantId } = useOrg();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "price" | "stock">("name");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", tenantId],
    enabled: !!tenantId,
    queryFn: async () =>
      (await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId!)
        .eq("is_active", true)
        .order("name")
      ).data ?? [],
  });

  const lowStockCount = products.filter(
    p => (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10)
  ).length;

  const filtered = products
    .filter(p => {
      const q = search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) ||
        (p.category_name ?? "").toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q);
      const matchLow = !filterLowStock ||
        (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10);
      return matchSearch && matchLow;
    })
    .sort((a, b) => {
      if (sortBy === "price") return Number(b.price) - Number(a.price);
      if (sortBy === "stock") return (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0);
      return a.name.localeCompare(b.name);
    });

  const save = async () => {
    if (!form.name.trim()) { toast.error("Product name is required"); return; }
    if (form.price <= 0) { toast.error("Price must be greater than 0"); return; }
    if (!tenantId) { toast.error("No business found — please sign in again"); return; }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: form.price,
        cost_price: form.cost_price || 0,
        stock_quantity: form.stock_quantity || 0,
        low_stock_threshold: form.low_stock_threshold || 10,
        category_name: form.category_name || null,
        emoji: form.emoji || "📦",
        sku: form.sku || null,
        barcode: form.barcode || null,
        is_active: true,
        tenant_id: tenantId,
      };

      const { error } = form.id
        ? await supabase.from("products").update(payload).eq("id", form.id)
        : await supabase.from("products").insert(payload);

      if (error) throw error;

      toast.success(form.id ? "Product updated!" : "Product added!");
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
    if (!confirm("Delete this product? This cannot be undone.")) return;
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

  const f = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.type === "number" ? Number(e.target.value) : e.target.value }));

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">
            {products.length} item{products.length !== 1 ? "s" : ""} in catalog
            {lowStockCount > 0 && (
              <span className="ml-2 text-amber-500 font-medium">
                · {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>

        <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="size-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-2">
              {/* Name */}
              <div className="col-span-2 space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={f("name")} placeholder="e.g. Bread, Milk, Cable..." />
              </div>

              {/* Emoji + Category */}
              <div className="space-y-1.5">
                <Label>Emoji</Label>
                <Input value={form.emoji} onChange={f("emoji")} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={form.category_name} onChange={f("category_name")} placeholder="e.g. Food, Electronics" />
              </div>

              {/* Price + Cost */}
              <div className="space-y-1.5">
                <Label>Selling Price (KES) *</Label>
                <Input type="number" min="0" value={form.price || ""} onChange={f("price")} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Cost Price (KES)</Label>
                <Input type="number" min="0" value={form.cost_price || ""} onChange={f("cost_price")} placeholder="0" />
              </div>

              {/* Stock + Low stock */}
              <div className="space-y-1.5">
                <Label>Stock Quantity</Label>
                <Input type="number" min="0" value={form.stock_quantity || ""} onChange={f("stock_quantity")} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label>Low Stock Alert</Label>
                <Input type="number" min="0" value={form.low_stock_threshold || ""} onChange={f("low_stock_threshold")} placeholder="10" />
              </div>

              {/* SKU + Barcode */}
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={f("sku")} placeholder="Optional" />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode</Label>
                <Input value={form.barcode} onChange={f("barcode")} placeholder="Optional" />
              </div>

              {/* Profit margin preview */}
              {form.price > 0 && form.cost_price > 0 && (
                <div className="col-span-2 rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-sm">
                  <span className="text-muted-foreground">Profit margin: </span>
                  <span className="font-bold text-emerald-600">
                    {fmtMoney(form.price - form.cost_price)} ({Math.round(((form.price - form.cost_price) / form.price) * 100)}%)
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving…" : form.id ? "Update Product" : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products, SKU, category…"
            className="pl-9"
          />
        </div>
        <Button
          variant={filterLowStock ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => setFilterLowStock(v => !v)}
        >
          <AlertTriangle className="size-3.5" />
          Low Stock {lowStockCount > 0 && `(${lowStockCount})`}
        </Button>
        <Button
          variant="outline" size="sm" className="gap-1.5"
          onClick={() => setSortBy(s => s === "name" ? "price" : s === "price" ? "stock" : "name")}
        >
          <ArrowUpDown className="size-3.5" />
          Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {products.length} products
        </span>
      </div>

      {/* Product grid on mobile, table on desktop */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <Package className="size-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No products found</p>
          <p className="text-xs mt-1">
            {search ? "Try a different search" : "Click \"Add Product\" to get started"}
          </p>
        </Card>
      ) : (
        <>
          {/* Mobile card grid */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {filtered.map(p => {
              const isLow = (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10);
              const margin = p.price > 0 && p.cost_price > 0
                ? Math.round(((p.price - p.cost_price) / p.price) * 100) : null;
              return (
                <Card key={p.id} className={`p-3 relative ${isLow ? "border-amber-200" : ""}`}>
                  {isLow && (
                    <span className="absolute top-2 right-2">
                      <AlertTriangle className="size-3.5 text-amber-500" />
                    </span>
                  )}
                  <div className="text-2xl mb-2">{p.emoji ?? "📦"}</div>
                  <div className="font-semibold text-sm truncate">{p.name}</div>
                  {p.category_name && (
                    <div className="text-xs text-muted-foreground mt-0.5">{p.category_name}</div>
                  )}
                  <div className="font-bold mt-1">{fmtMoney(Number(p.price))}</div>
                  <div className={`text-xs mt-0.5 ${isLow ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}>
                    {p.stock_quantity ?? 0} in stock
                    {isLow && " ⚠"}
                  </div>
                  {margin !== null && (
                    <div className="text-xs text-emerald-600 mt-0.5">{margin}% margin</div>
                  )}
                  <div className="flex gap-1 mt-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => openEdit(p)}>
                      <Pencil className="size-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => del(p.id)}>
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Desktop table */}
          <Card className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b bg-muted/30">
                <tr>
                  <th className="text-left p-3 pl-4">Product</th>
                  <th className="text-left p-3">Category</th>
                  <th className="text-right p-3">Price</th>
                  <th className="text-right p-3">Cost</th>
                  <th className="text-right p-3">Margin</th>
                  <th className="text-right p-3">Stock</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const isLow = (p.stock_quantity ?? 0) <= (p.low_stock_threshold ?? 10);
                  const margin = p.price > 0 && p.cost_price > 0
                    ? Math.round(((p.price - p.cost_price) / p.price) * 100) : null;
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="p-3 pl-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl shrink-0">{p.emoji ?? "📦"}</span>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            {p.sku && <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        {p.category_name
                          ? <Badge variant="secondary" className="text-xs">{p.category_name}</Badge>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="p-3 text-right font-semibold">{fmtMoney(Number(p.price))}</td>
                      <td className="p-3 text-right text-muted-foreground">
                        {p.cost_price ? fmtMoney(Number(p.cost_price)) : "—"}
                      </td>
                      <td className="p-3 text-right">
                        {margin !== null
                          ? <span className="text-emerald-600 font-medium">{margin}%</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-medium ${isLow ? "text-amber-500" : ""}`}>
                          {p.stock_quantity ?? 0}
                          {isLow && " ⚠"}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button size="icon" variant="ghost"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => del(p.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
