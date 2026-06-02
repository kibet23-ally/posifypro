// src/routes/_app.dashboard.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import { DollarSign, ShoppingCart, Package, Users, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get tenant_id for this user
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", user!.id)
        .single();

      if (!profile?.tenant_id) return null;
      const tid = profile.tenant_id;

      const today = new Date(); today.setHours(0, 0, 0, 0);

      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase
          .from("orders")
          .select("total_amount, created_at, status")
          .eq("tenant_id", tid)
          .eq("status", "completed")
          .gte("created_at", today.toISOString()),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tid)
          .eq("is_active", true),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("tenant_id", tid),
      ]);

      const todayRevenue = (ordersRes.data ?? []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const todayCount = (ordersRes.data ?? []).length;

      // Recent orders with items
      const { data: recent } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, payment_method, created_at, profiles(full_name)")
        .eq("tenant_id", tid)
        .order("created_at", { ascending: false })
        .limit(8);

      // Low stock products
      const { data: low } = await supabase
        .from("products")
        .select("id, name, stock_quantity, low_stock_threshold, image_url")
        .eq("tenant_id", tid)
        .eq("is_active", true)
        .lte("stock_quantity", 10)
        .order("stock_quantity")
        .limit(5);

      // This week's revenue (last 7 days)
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: weekOrders } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("tenant_id", tid)
        .eq("status", "completed")
        .gte("created_at", weekAgo.toISOString());

      const weekRevenue = (weekOrders ?? []).reduce((s, r) => s + Number(r.total_amount || 0), 0);
      const weekCount = (weekOrders ?? []).length;

      return {
        todayRevenue,
        todayCount,
        weekRevenue,
        weekCount,
        products: productsRes.count ?? 0,
        customers: customersRes.count ?? 0,
        recent: recent ?? [],
        low: low ?? [],
        tenantId: tid,
      };
    },
  });

  const stats = [
    { label: "Today's Revenue", value: fmtMoney(data?.todayRevenue ?? 0), icon: DollarSign, accent: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Today's Orders", value: String(data?.todayCount ?? 0), icon: ShoppingCart, accent: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Products", value: String(data?.products ?? 0), icon: Package, accent: "text-amber-500", bg: "bg-amber-50" },
    { label: "Customers", value: String(data?.customers ?? 0), icon: Users, accent: "text-purple-500", bg: "bg-purple-50" },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-muted rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <Link to="/pos">
          <Button className="gap-2">
            <ShoppingCart className="size-4" /> New Sale
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${s.bg}`}>
                <s.icon className={`size-4 ${s.accent}`} />
              </div>
            </div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* This Week Summary */}
      <Card className="p-5 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">This week's revenue</p>
            <p className="text-3xl font-bold mt-1">{fmtMoney(data?.weekRevenue ?? 0)}</p>
            <p className="text-sm text-muted-foreground mt-1">{data?.weekCount ?? 0} orders in the last 7 days</p>
          </div>
          <TrendingUp className="size-10 text-primary opacity-20" />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-primary" />
              <h2 className="font-semibold">Recent Orders</h2>
            </div>
            <Link to="/sales" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y">
            {(data?.recent ?? []).length === 0 && (
              <div className="py-8 text-sm text-muted-foreground text-center">
                No orders yet —{" "}
                <Link to="/pos" className="text-primary hover:underline">
                  make your first sale
                </Link>
              </div>
            )}
            {(data?.recent ?? []).map((r: any) => (
              <div key={r.id} className="py-3 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.order_number}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {r.profiles?.full_name ?? "Walk-in"} · {r.payment_method}
                  </div>
                </div>
                <div className="font-semibold">{fmtMoney(Number(r.total_amount))}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Low Stock */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="font-semibold">Low Stock</h2>
          </div>
          <div className="space-y-3">
            {(data?.low ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">
                ✅ All products stocked up
              </div>
            )}
            {(data?.low ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-7 rounded-md bg-muted flex items-center justify-center text-xs shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} className="size-7 rounded-md object-cover" alt={p.name} />
                    ) : "📦"}
                  </div>
                  <span className="truncate">{p.name}</span>
                </div>
                <span className={`font-medium shrink-0 ml-2 ${p.stock_quantity === 0 ? "text-destructive" : "text-amber-500"}`}>
                  {p.stock_quantity === 0 ? "Out!" : `${p.stock_quantity} left`}
                </span>
              </div>
            ))}
            {(data?.low ?? []).length > 0 && (
              <Link to="/products">
                <Button variant="outline" size="sm" className="w-full mt-2">
                  Manage Stock
                </Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
