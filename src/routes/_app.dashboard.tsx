import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { fmtMoney } from "@/lib/format";
import { DollarSign, ShoppingCart, Package, Users, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { data } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: sales }, { count: products }, { count: customers }] = await Promise.all([
        supabase.from("sales").select("total, created_at").gte("created_at", today.toISOString()),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("customers").select("*", { count: "exact", head: true }),
      ]);
      const todayRevenue = (sales ?? []).reduce((s, r) => s + Number(r.total || 0), 0);
      const todayCount = (sales ?? []).length;

      const { data: recent } = await supabase.from("sales").select("receipt_number, total, customer_name, created_at, payment_method").order("created_at", { ascending: false }).limit(10);
      const { data: low } = await supabase.from("products").select("name, stock, low_stock_threshold, emoji").lte("stock", 10).order("stock").limit(5);

      return { todayRevenue, todayCount, products: products ?? 0, customers: customers ?? 0, recent: recent ?? [], low: low ?? [] };
    },
  });

  const stats = [
    { label: "Today's revenue", value: fmtMoney(data?.todayRevenue ?? 0), icon: DollarSign, accent: "text-success" },
    { label: "Today's sales", value: String(data?.todayCount ?? 0), icon: ShoppingCart, accent: "text-primary" },
    { label: "Products", value: String(data?.products ?? 0), icon: Package, accent: "text-warning" },
    { label: "Customers", value: String(data?.customers ?? 0), icon: Users, accent: "text-foreground" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your shop today.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{s.label}</div>
              <s.icon className={`size-5 ${s.accent}`} />
            </div>
            <div className="mt-2 text-2xl font-semibold">{s.value}</div>
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="size-4 text-primary" /><h2 className="font-semibold">Recent sales</h2></div>
          <div className="divide-y">
            {(data?.recent ?? []).length === 0 && <div className="py-6 text-sm text-muted-foreground text-center">No sales yet — head to Point of Sale.</div>}
            {(data?.recent ?? []).map((r) => (
              <div key={r.receipt_number} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.receipt_number}</div>
                  <div className="text-xs text-muted-foreground">{r.customer_name} • {r.payment_method}</div>
                </div>
                <div className="font-semibold">{fmtMoney(Number(r.total))}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold mb-4">Low stock</h2>
          <div className="space-y-3">
            {(data?.low ?? []).length === 0 && <div className="text-sm text-muted-foreground">All stocked up.</div>}
            {(data?.low ?? []).map((p) => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2"><span className="text-lg">{p.emoji}</span>{p.name}</div>
                <span className="text-warning font-medium">{p.stock} left</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
