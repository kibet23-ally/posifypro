// src/routes/_app.sales.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fmtMoney } from "@/lib/format";
import { useOrg } from "@/hooks/use-org";
import { Search, Receipt, TrendingUp, ShoppingCart, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/_app/sales")({ component: SalesPage });

const METHOD_ICON: Record<string, string> = {
  cash: "💵", mpesa: "📱", card: "💳", other: "🔄",
};

function SalesPage() {
  const { tenantId } = useOrg();
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["sales-history", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("*, profiles(name), sale_items(product_name, quantity, product_price, total)")
        .eq("org_id", tenantId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Summary stats
  const totalRevenue = orders
    .filter(o => o.status === "completed")
    .reduce((s, o) => s + Number(o.total), 0);
  const todayRevenue = orders
    .filter(o => o.status === "completed" &&
      new Date(o.created_at).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + Number(o.total), 0);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      o.receipt_number?.toLowerCase().includes(q) ||
      (o.profiles as any)?.name?.toLowerCase().includes(q);
    const matchMethod = filterMethod === "all" || o.payment_method === filterMethod;
    return matchSearch && matchMethod;
  });

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const STATUS_CFG: Record<string, { color: string; label: string }> = {
    completed: { color: "bg-emerald-100 text-emerald-700", label: "Completed" },
    refunded:  { color: "bg-blue-100 text-blue-700",       label: "Refunded"  },
    cancelled: { color: "bg-red-100 text-red-700",         label: "Cancelled" },
    pending:   { color: "bg-amber-100 text-amber-700",     label: "Pending"   },
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Sales History</h1>
        <p className="text-sm text-muted-foreground">{orders.length} total transactions</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Total Revenue",  value: fmtMoney(totalRevenue), icon: TrendingUp, color: "#6366f1" },
          { label: "Today's Revenue", value: fmtMoney(todayRevenue), icon: ShoppingCart, color: "#10b981" },
          { label: "Total Orders",   value: String(orders.filter(o => o.status === "completed").length), icon: Receipt, color: "#f59e0b" },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className="p-2 rounded-lg w-fit mb-2" style={{ background: `${s.color}15` }}>
              <s.icon className="size-4" style={{ color: s.color }} />
            </div>
            <div className="text-xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search order #, cashier…" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {["all", "cash", "mpesa", "card"].map(m => (
            <Button key={m} size="sm"
              variant={filterMethod === m ? "default" : "outline"}
              onClick={() => { setFilterMethod(m); setPage(0); }}
              className="capitalize text-xs"
            >
              {m === "all" ? "All" : METHOD_ICON[m] + " " + m.charAt(0).toUpperCase() + m.slice(1)}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} transactions
        </span>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center text-muted-foreground">
          <Receipt className="size-12 mx-auto mb-3 opacity-20" />
          <p>No sales found</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginated.map(order => {
            const statusCfg = STATUS_CFG[order.status] ?? STATUS_CFG.pending;
            const isOpen = expanded === order.id;
            const items = (order.sale_items as any[]) ?? [];
            return (
              <Card key={order.id} className="overflow-hidden">
                {/* Order row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                >
                  <div className="text-2xl shrink-0">{METHOD_ICON[order.payment_method] ?? "🧾"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{order.receipt_number}</span>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {(order.profiles as any)?.name ?? "Walk-in"} ·{" "}
                      {new Date(order.created_at).toLocaleDateString("en-KE", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                      {" · "}{items.length} item{items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold">{fmtMoney(Number(order.total))}</div>
                    <div className="text-xs text-muted-foreground capitalize">{order.payment_method}</div>
                  </div>
                  {isOpen
                    ? <ChevronUp className="size-4 text-muted-foreground shrink-0" />
                    : <ChevronDown className="size-4 text-muted-foreground shrink-0" />
                  }
                </div>

                {/* Expanded receipt */}
                {isOpen && (
                  <div className="border-t bg-muted/20 p-4 space-y-3 text-sm">
                    <div className="space-y-1.5">
                      {items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {item.product_name} × {item.quantity}
                          </span>
                          <span className="font-medium">{fmtMoney(Number(item.total))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-2 space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>{fmtMoney(Number(order.subtotal))}</span>
                      </div>
                      {Number(order.discount_amount) > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span>-{fmtMoney(Number(order.discount_amount))}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{fmtMoney(Number(order.total))}</span>
                      </div>
                      {order.payment_method === "cash" && (
                        <>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Amount paid</span>
                            <span>{fmtMoney(Number(order.amount_paid))}</span>
                          </div>
                          {Number(order.change_amount) > 0 && (
                            <div className="flex justify-between text-blue-600">
                              <span>Change</span>
                              <span>{fmtMoney(Number(order.change_amount))}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground self-center">
            Page {page + 1} of {Math.ceil(filtered.length / PAGE_SIZE)}
          </span>
          <Button variant="outline" size="sm"
            disabled={(page + 1) * PAGE_SIZE >= filtered.length}
            onClick={() => setPage(p => p + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
