import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Minus, Trash2, Search, X } from "lucide-react";
import { fmtMoney, genReceiptNo } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";

export const Route = createFileRoute("/_app/pos")({ component: POS });

type CartItem = { id: string; name: string; emoji: string | null; price: number; cost_price: number; quantity: number; stock: number };

function POS() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cash, setCash] = useState("");
  const [discountPct, setDiscountPct] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-Pesa" | "Card">("Cash");

  const { data: products = [] } = useQuery({
    queryKey: ["pos-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("is_active", true).order("name");
      if (error) throw error; return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").limit(1).maybeSingle()).data,
  });

  const symbol = settings?.currency_symbol || "KSh";
  const taxRate = Number(settings?.tax_rate ?? 16);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q));
  }, [products, search]);

  const addToCart = (p: typeof products[number]) => {
    setCart((c) => {
      const ex = c.find((i) => i.id === p.id);
      if (ex) {
        if (ex.quantity >= (p.stock ?? 0)) { toast.error("Not enough stock"); return c; }
        return c.map((i) => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if ((p.stock ?? 0) < 1) { toast.error("Out of stock"); return c; }
      return [...c, { id: p.id, name: p.name, emoji: p.emoji, price: Number(p.price), cost_price: Number(p.cost_price || 0), quantity: 1, stock: p.stock ?? 0 }];
    });
  };

  const updateQty = (id: string, delta: number) =>
    setCart((c) => c.flatMap((i) => {
      if (i.id !== id) return [i];
      const next = i.quantity + delta;
      if (next < 1) return [];
      if (next > i.stock) { toast.error("Not enough stock"); return [i]; }
      return [{ ...i, quantity: next }];
    }));

  const removeItem = (id: string) => setCart((c) => c.filter((i) => i.id !== id));

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discount = subtotal * (discountPct / 100);
  const taxable = subtotal - discount;
  const tax = taxable * (taxRate / 100);
  const total = taxable + tax;
  const cashNum = Number(cash || 0);
  const change = paymentMethod === "Cash" ? Math.max(0, cashNum - total) : 0;

  const checkout = async () => {
    if (cart.length === 0) return;
    if (paymentMethod === "Cash" && cashNum < total) { toast.error("Cash received is less than total"); return; }
    if (!orgId) { toast.error("No organization found"); return; }

    const receipt_number = genReceiptNo();
    const { data: sale, error } = await supabase.from("sales").insert({
      org_id: orgId,
      receipt_number, subtotal, tax_amount: tax, tax_rate: taxRate, discount_amount: discount, discount_pct: discountPct,
      total, payment_method: paymentMethod, cash_received: paymentMethod === "Cash" ? cashNum : total,
      change_given: change, status: "completed", synced: true, customer_name: "Walk-in",
      cashier_id: user?.id ?? null, cashier_name: user?.email ?? null,
    }).select().single();

    if (error || !sale) { toast.error(error?.message || "Failed to record sale"); return; }

    const items = cart.map((i) => ({
      org_id: orgId,
      sale_id: sale.id, product_id: i.id, product_name: i.name, product_emoji: i.emoji,
      unit_price: i.price, cost_price: i.cost_price, quantity: i.quantity, subtotal: i.price * i.quantity,
    }));
    await supabase.from("sale_items").insert(items);

    // decrement stock
    await Promise.all(cart.map((i) =>
      supabase.from("products").update({ stock: i.stock - i.quantity }).eq("id", i.id)
    ));

    toast.success(`Sale completed — ${receipt_number}`);
    setCart([]); setCash(""); setDiscountPct(0);
    qc.invalidateQueries({ queryKey: ["pos-products"] });
    qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_400px] h-[calc(100vh-0px)] md:h-screen">
      <div className="flex flex-col p-4 md:p-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold">Point of Sale</h1>
            <p className="text-xs text-muted-foreground">{products.length} products available</p>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search or scan barcode…" className="pl-9" />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">No products. Add some in <strong>Products</strong>.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addToCart(p)} className="group p-3 rounded-xl border bg-card hover:border-primary hover:shadow-md transition text-left">
                  <div className="text-3xl">{p.emoji}</div>
                  <div className="mt-2 font-medium text-sm line-clamp-2">{p.name}</div>
                  <div className="mt-1 flex justify-between items-center">
                    <span className="text-primary font-semibold text-sm">{fmtMoney(Number(p.price), symbol)}</span>
                    <span className={`text-[10px] ${(p.stock ?? 0) <= (p.low_stock_threshold ?? 10) ? "text-warning" : "text-muted-foreground"}`}>{p.stock} left</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="border-l bg-card flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Current sale</h2>
          <p className="text-xs text-muted-foreground">{cart.length} item{cart.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex-1 overflow-auto">
          {cart.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Tap a product to add it to the cart.</div>
          ) : (
            <div className="divide-y">
              {cart.map((i) => (
                <div key={i.id} className="p-3 flex items-center gap-2">
                  <div className="text-2xl">{i.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{i.name}</div>
                    <div className="text-xs text-muted-foreground">{fmtMoney(i.price, symbol)} × {i.quantity}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-7" onClick={() => updateQty(i.id, -1)}><Minus className="size-3" /></Button>
                    <span className="w-6 text-center text-sm">{i.quantity}</span>
                    <Button size="icon" variant="outline" className="size-7" onClick={() => updateQty(i.id, 1)}><Plus className="size-3" /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => removeItem(i.id)}><Trash2 className="size-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="border-t p-4 space-y-3">
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(subtotal, symbol)}</span></div>
            <div className="flex justify-between items-center"><span className="text-muted-foreground">Discount %</span>
              <Input type="number" min={0} max={100} value={discountPct} onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value))))} className="h-7 w-20 text-right" /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({taxRate}%)</span><span>{fmtMoney(tax, symbol)}</span></div>
            <div className="flex justify-between text-base font-semibold pt-1 border-t"><span>Total</span><span className="text-primary">{fmtMoney(total, symbol)}</span></div>
          </div>
          <div>
            <Label className="text-xs">Payment method</Label>
            <div className="grid grid-cols-3 gap-1 mt-1">
              {(["Cash", "M-Pesa", "Card"] as const).map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)} className={`text-xs py-2 rounded-md border ${paymentMethod === m ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:border-primary"}`}>{m}</button>
              ))}
            </div>
          </div>
          {paymentMethod === "Cash" && (
            <div>
              <Label htmlFor="cash" className="text-xs">Cash received</Label>
              <Input id="cash" type="number" value={cash} onChange={(e) => setCash(e.target.value)} placeholder="0.00" />
              {cashNum >= total && cart.length > 0 && <div className="text-xs text-success mt-1">Change: {fmtMoney(change, symbol)}</div>}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={cart.length === 0} onClick={() => { setCart([]); setCash(""); setDiscountPct(0); }}><X className="size-4" /> Clear</Button>
            <Button className="flex-[2]" disabled={cart.length === 0} onClick={checkout}>Charge {fmtMoney(total, symbol)}</Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
