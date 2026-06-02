import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/_app/products")({ component: ProductsPage });

type Form = { id?: string; name: string; price: number; cost_price: number; stock: number; category_name: string; emoji: string; barcode: string; low_stock_threshold: number };
const empty: Form = { name: "", price: 0, cost_price: 0, stock: 0, category_name: "", emoji: "📦", barcode: "", low_stock_threshold: 10 };

function ProductsPage() {
  const qc = useQueryClient();
  const { orgId } = useOrg();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: async () => (await supabase.from("products").select("*").order("name")).data ?? [],
  });

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.name || form.price <= 0) { toast.error("Name and price are required"); return; }
    if (!orgId) { toast.error("No organization found"); return; }
    const payload = { ...form, is_active: true, org_id: orgId };
    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(form.id ? "Product updated" : "Product added");
    setOpen(false); setForm(empty);
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["pos-products"] });
  };

  const del = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["products"] });
  };

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} items in your catalog</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setForm(empty); }}>
          <DialogTrigger asChild><Button><Plus className="size-4" /> Add product</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Emoji</Label><Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} /></div>
              <div><Label>Category</Label><Input value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} /></div>
              <div><Label>Price</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
              <div><Label>Cost price</Label><Input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} /></div>
              <div><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
              <div><Label>Low stock alert</Label><Input type="number" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: Number(e.target.value) })} /></div>
              <div className="col-span-2"><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" className="pl-9" />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr><th className="text-left p-3">Product</th><th className="text-left p-3">Category</th><th className="text-right p-3">Price</th><th className="text-right p-3">Stock</th><th className="p-3 w-24"></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No products yet.</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3"><div className="flex items-center gap-2"><span className="text-xl">{p.emoji}</span>{p.name}</div></td>
                <td className="p-3 text-muted-foreground">{p.category_name || "—"}</td>
                <td className="p-3 text-right font-medium">{fmtMoney(Number(p.price))}</td>
                <td className={`p-3 text-right ${(p.stock ?? 0) <= (p.low_stock_threshold ?? 10) ? "text-warning font-medium" : ""}`}>{p.stock}</td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setForm({ id: p.id, name: p.name, price: Number(p.price), cost_price: Number(p.cost_price ?? 0), stock: p.stock ?? 0, category_name: p.category_name ?? "", emoji: p.emoji ?? "📦", barcode: p.barcode ?? "", low_stock_threshold: p.low_stock_threshold ?? 10 }); setOpen(true); }}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(p.id)}><Trash2 className="size-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
