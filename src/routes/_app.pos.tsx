// src/routes/_app.pos.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtMoney } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/_app/pos")({ component: POS });

// -------------------------------------------------------
// Types
// -------------------------------------------------------
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  emoji?: string;
  category_id?: string;
  categories?: { name: string; color: string };
}

interface CartItem {
  product: Product;
  quantity: number;
}

type PaymentMethod = "cash" | "mpesa" | "card" | "other";

// -------------------------------------------------------
// Receipt Modal
// -------------------------------------------------------
function ReceiptModal({ order, onClose }: { order: any; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px",
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "28px",
        width: "100%", maxWidth: "360px", fontFamily: "monospace",
      }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <CheckCircle style={{ width: "40px", height: "40px", color: "#10b981", margin: "0 auto 8px" }} />
          <h2 style={{ fontWeight: "800", fontSize: "18px", margin: 0 }}>Sale Complete!</h2>
          <p style={{ color: "#6b7280", fontSize: "12px", marginTop: "4px" }}>{order.receipt_number}</p>
        </div>
        <div style={{ borderTop: "1px dashed #e5e7eb", borderBottom: "1px dashed #e5e7eb", padding: "12px 0", marginBottom: "12px" }}>
          {order.items.map((item: any) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "6px" }}>
              <span>{item.product_name} × {item.quantity}</span>
              <span>{fmtMoney(item.total)}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: "13px", space: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
            <span style={{ color: "#6b7280" }}>Subtotal</span>
            <span>{fmtMoney(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", color: "#10b981" }}>
              <span>Discount</span>
              <span>-{fmtMoney(order.discount_amount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "800", fontSize: "16px", marginTop: "8px" }}>
            <span>Total</span>
            <span>{fmtMoney(order.total)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", color: "#6b7280" }}>
            <span>Paid ({order.payment_method})</span>
            <span>{fmtMoney(order.amount_paid)}</span>
          </div>
          {order.change_amount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", color: "#3b82f6", fontWeight: "600" }}>
              <span>Change</span>
              <span>{fmtMoney(order.change_amount)}</span>
            </div>
          )}
        </div>
        <Button onClick={onClose} className="w-full mt-6">New Sale</Button>
      </div>
    </div>
  );
}

// -------------------------------------------------------
// Main POS Component
// -------------------------------------------------------
function POS() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [discount, setDiscount] = useState("");
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);

  // Get tenant info
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("org_id, id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) { setTenantId(data.org_id); setCashierId(data.id); }
      });
  }, [user]);

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["pos-products", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, color)")
        .eq("org_id", tenantId!)
        .eq("is_active", true)
        .gt("stock", 0)
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  // Filter products
  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  // Cart calculations
  const subtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const discountAmt = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);
  const paid = Number(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  // Cart actions
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} in stock`);
          return prev;
        }
        return prev.map(i => i.product.id === product.id
          ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  // Generate order number
  const genOrderNumber = async () => {
    const { count } = await supabase
      .from("sales")
      .select("*", { count: "exact", head: true })
      .eq("org_id", tenantId!);
    return `ORD-${String((count ?? 0) + 1).padStart(4, "0")}`;
  };

  // Checkout mutation
  const checkout = useMutation({
    mutationFn: async () => {
      if (!tenantId || !cashierId) throw new Error("Not authenticated");
      if (cart.length === 0) throw new Error("Cart is empty");
      if (paymentMethod === "cash" && paid < total) throw new Error("Amount paid is less than total");

      const orderNumber = await genOrderNumber();

      // Create order
      const { data: order, error: orderErr } = await supabase
        .from("sales")
        .insert({
          org_id: tenantId,
          cashier_id: cashierId,
          receipt_number: orderNumber,
          status: "completed",
          payment_method: paymentMethod,
          subtotal,
          discount_amount: discountAmt,
          tax_amount: 0,
          total: total,
          amount_paid: paymentMethod === "cash" ? paid : total,
          change_amount: paymentMethod === "cash" ? change : 0,
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // Create order items
      const items = cart.map(i => ({
        order_id: order.id,
        org_id: tenantId,
        product_id: i.product.id,
        product_name: i.product.name,
        product_price: i.product.price,
        quantity: i.quantity,
        discount: 0,
        total: i.product.price * i.quantity,
      }));

      const { error: itemsErr } = await supabase.from("sale_items").insert(items);
      if (itemsErr) throw itemsErr;

      // Decrement stock
      for (const i of cart) {
        await supabase
          .from("products")
          .update({ stock: i.product.stock - i.quantity })
          .eq("id", i.product.id);
      }

      return { ...order, items };
    },
    onSuccess: (data) => {
      setCompletedOrder(data);
      setCart([]);
      setAmountPaid("");
      setDiscount("");
      queryClient.invalidateQueries({ queryKey: ["pos-products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message ?? "Checkout failed");
    },
  });

  const paymentMethods: { id: PaymentMethod; label: string; icon: string }[] = [
    { id: "cash", label: "Cash", icon: "💵" },
    { id: "mpesa", label: "M-Pesa", icon: "📱" },
    { id: "card", label: "Card", icon: "💳" },
    { id: "other", label: "Other", icon: "🔄" },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-60px)] overflow-hidden">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col min-h-0 p-4 overflow-hidden">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Package className="size-10 mb-2 opacity-30" />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filtered.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                return (
                  <Card
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`p-3 cursor-pointer transition-all hover:shadow-md active:scale-95 ${inCart ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="aspect-square rounded-lg bg-muted mb-2 flex items-center justify-center overflow-hidden">
                      {p.emoji
                        ? <img src={p.emoji} className="w-full h-full object-cover" alt={p.name} />
                        : <span className="text-2xl">📦</span>
                      }
                    </div>
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-sm font-bold text-primary mt-0.5">{fmtMoney(p.price)}</p>
                    <p className="text-xs text-muted-foreground">{p.stock} in stock</p>
                    {inCart && (
                      <div className="mt-1 bg-primary text-primary-foreground rounded text-xs text-center py-0.5 font-semibold">
                        {inCart.quantity} in cart
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout */}
      <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l flex flex-col bg-card">
        {/* Cart Header */}
        <div className="p-4 border-b flex items-center gap-2">
          <ShoppingCart className="size-5 text-primary" />
          <h2 className="font-semibold">Cart</h2>
          {cart.length > 0 && (
            <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
              {cart.reduce((s, i) => s + i.quantity, 0)} items
            </span>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <ShoppingCart className="size-8 mb-2 opacity-30" />
              <p className="text-sm">Tap products to add</p>
            </div>
          )}
          {cart.map(item => (
            <div key={item.product.id} className="flex items-center gap-2 bg-background rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">{fmtMoney(item.product.price)} each</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product.id, -1)}
                  className="size-6 rounded-full bg-muted flex items-center justify-center">
                  <Minus className="size-3" />
                </button>
                <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                <button onClick={() => updateQty(item.product.id, 1)}
                  className="size-6 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="text-sm font-semibold w-16 text-right">
                {fmtMoney(item.product.price * item.quantity)}
              </div>
              <button onClick={() => removeFromCart(item.product.id)}
                className="text-destructive hover:opacity-70">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Checkout Panel */}
        {cart.length > 0 && (
          <div className="p-4 border-t space-y-3">
            {/* Discount */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-20">Discount</span>
              <Input
                type="number"
                placeholder="0"
                value={discount}
                onChange={e => setDiscount(e.target.value)}
                className="h-8 text-sm"
              />
            </div>

            {/* Totals */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>{fmtMoney(subtotal)}</span>
              </div>
              {discountAmt > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span><span>-{fmtMoney(discountAmt)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total</span><span>{fmtMoney(total)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-4 gap-1">
              {paymentMethods.map(m => (
                <button
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    paymentMethod === m.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>

            {/* Amount paid (cash only) */}
            {paymentMethod === "cash" && (
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Amount paid"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  className="h-9"
                />
                {paid >= total && paid > 0 && (
                  <div className="flex justify-between text-sm font-semibold text-blue-600 bg-blue-50 rounded px-2 py-1">
                    <span>Change</span><span>{fmtMoney(change)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Checkout Button */}
            <Button
              className="w-full h-12 text-base font-bold"
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending || (paymentMethod === "cash" && paid < total)}
            >
              {checkout.isPending ? "Processing…" : `Charge ${fmtMoney(total)}`}
            </Button>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {completedOrder && (
        <ReceiptModal
          order={completedOrder}
          onClose={() => setCompletedOrder(null)}
        />
      )}
    </div>
  );
}

// Missing import fix
const Package = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
