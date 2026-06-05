// src/routes/_app.dashboard.tsx
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { fmtMoney } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign, ShoppingCart, Package, Users, TrendingUp,
  ArrowUpRight, ArrowDownRight, AlertTriangle, ChevronRight,
  Receipt, Clock, Star,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

// ── Custom tooltip ──
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name === "revenue" ? fmtMoney(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

function Dashboard() {
  const { user } = useAuth();
  const { org } = useOrg();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-stats-v2", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get tenant
      const { data: profile } = await supabase
        .from("profiles").select("org_id, organizations(name)").eq("id", user!.id).single();
      const tid = profile?.org_id;
      const businessName = (profile?.tenants as any)?.name ?? null;

      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
      const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
      const monthAgo = new Date(now); monthAgo.setDate(now.getDate() - 30);
      const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(todayStart.getDate() - 1);
      const yesterdayEnd = new Date(todayStart);

      // Core queries
      const [todayOrders, yesterdayOrders, weekOrders, monthOrders, products, customers, lowStock, recentOrders] =
        await Promise.all([
          supabase.from("sales").select("total").eq("org_id", tid).eq("status", "completed").gte("created_at", todayStart.toISOString()),
          supabase.from("sales").select("total").eq("org_id", tid).eq("status", "completed").gte("created_at", yesterdayStart.toISOString()).lt("created_at", yesterdayEnd.toISOString()),
          supabase.from("sales").select("total, created_at").eq("org_id", tid).eq("status", "completed").gte("created_at", weekAgo.toISOString()),
          supabase.from("sales").select("total, created_at, payment_method").eq("org_id", tid).eq("status", "completed").gte("created_at", monthAgo.toISOString()),
          supabase.from("products").select("*", { count: "exact", head: true }).eq("org_id", tid).eq("is_active", true),
          supabase.from("customers").select("*", { count: "exact", head: true }).eq("org_id", tid),
          supabase.from("products").select("id, name, stock, emoji").eq("org_id", tid).eq("is_active", true).lte("stock", 10).order("stock").limit(6),
          supabase.from("sales").select("id, receipt_number, total, payment_method, created_at, profiles(name)").eq("org_id", tid).order("created_at", { ascending: false }).limit(8),
        ]);

      const todayRevenue = (todayOrders.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const yesterdayRevenue = (yesterdayOrders.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const weekRevenue = (weekOrders.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const monthRevenue = (monthOrders.data ?? []).reduce((s, r) => s + Number(r.total), 0);
      const todayCount = todayOrders.data?.length ?? 0;
      const yesterdayCount = yesterdayOrders.data?.length ?? 0;

      // Revenue trend — last 7 days
      const days7: { day: string; revenue: number; orders: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
        const dEnd = new Date(d); dEnd.setHours(23, 59, 59, 999);
        const dayOrders = (weekOrders.data ?? []).filter(o => {
          const t = new Date(o.created_at);
          return t >= d && t <= dEnd;
        });
        days7.push({
          day: d.toLocaleDateString("en-KE", { weekday: "short" }),
          revenue: dayOrders.reduce((s, o) => s + Number(o.total), 0),
          orders: dayOrders.length,
        });
      }

      // Payment method breakdown
      const methods: Record<string, number> = {};
      (monthOrders.data ?? []).forEach(o => {
        methods[o.payment_method] = (methods[o.payment_method] ?? 0) + 1;
      });
      const paymentChart = Object.entries(methods).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

      return {
        todayRevenue, yesterdayRevenue, weekRevenue, monthRevenue,
        todayCount, yesterdayCount,
        products: products.count ?? 0,
        customers: customers.count ?? 0,
        lowStock: lowStock.data ?? [],
        recentOrders: recentOrders.data ?? [],
        days7, paymentChart,
        businessName,
        revenueGrowth: yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0,
        orderGrowth: yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : 0,
      };
    },
  });

  const KPIs = [
    {
      label: "Today's Revenue", value: fmtMoney(data?.todayRevenue ?? 0),
      sub: `vs ${fmtMoney(data?.yesterdayRevenue ?? 0)} yesterday`,
      icon: DollarSign, color: "#6366f1", bg: "#f5f3ff",
      trend: data?.revenueGrowth,
    },
    {
      label: "Today's Orders", value: String(data?.todayCount ?? 0),
      sub: `${data?.yesterdayCount ?? 0} yesterday`,
      icon: ShoppingCart, color: "#10b981", bg: "#f0fdf4",
      trend: data?.orderGrowth,
    },
    {
      label: "This Week", value: fmtMoney(data?.weekRevenue ?? 0),
      sub: "Last 7 days", icon: TrendingUp, color: "#f59e0b", bg: "#fffbeb",
    },
    {
      label: "This Month", value: fmtMoney(data?.monthRevenue ?? 0),
      sub: "Last 30 days", icon: Receipt, color: "#3b82f6", bg: "#eff6ff",
    },
    {
      label: "Products", value: String(data?.products ?? 0),
      sub: `${data?.lowStock.length ?? 0} low stock`, icon: Package, color: "#8b5cf6", bg: "#f5f3ff",
    },
    {
      label: "Customers", value: String(data?.customers ?? 0),
      sub: "Total registered", icon: Users, color: "#ec4899", bg: "#fdf2f8",
    },
  ];

  const PAYMENT_COLORS: Record<string, string> = {
    Cash: "#10b981", Mpesa: "#3b82f6", Card: "#8b5cf6", Other: "#94a3b8",
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-muted animate-pulse rounded-xl" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {data?.businessName ?? org?.name ?? "Your Store"} · {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <Link to="/pos">
          <Button className="gap-2 shrink-0">
            <ShoppingCart className="size-4" /> New Sale
          </Button>
        </Link>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {KPIs.map((k) => {
          const up = (k.trend ?? 0) >= 0;
          return (
            <Card key={k.label} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: k.bg }}>
                  <k.icon className="size-4" style={{ color: k.color }} />
                </div>
                {k.trend !== undefined && (
                  <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${up ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                    {up ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {Math.abs(k.trend)}%
                  </div>
                )}
              </div>
              <div className="text-2xl font-extrabold tracking-tight">{k.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">{k.sub}</div>
            </Card>
          );
        })}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Revenue Area Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm">Revenue — Last 7 Days</h2>
              <p className="text-xs text-muted-foreground">{fmtMoney(data?.weekRevenue ?? 0)} this week</p>
            </div>
            <Link to="/sales" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="size-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data?.days7 ?? []}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" name="revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Method Breakdown */}
        <Card className="p-5">
          <h2 className="font-semibold text-sm mb-1">Payment Methods</h2>
          <p className="text-xs text-muted-foreground mb-4">This month's breakdown</p>
          {(data?.paymentChart ?? []).length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data?.paymentChart ?? []} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Orders">
                    {(data?.paymentChart ?? []).map((entry, i) => (
                      <rect key={i} fill={PAYMENT_COLORS[entry.name] ?? "#94a3b8"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {(data?.paymentChart ?? []).map(p => (
                  <div key={p.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full inline-block" style={{ background: PAYMENT_COLORS[p.name] ?? "#94a3b8" }} />
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="font-semibold">{p.value} orders</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Recent Orders */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              <h2 className="font-semibold text-sm">Recent Orders</h2>
            </div>
            <Link to="/sales" className="text-xs text-primary font-semibold flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {(data?.recentOrders ?? []).length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No orders yet —{" "}
                <Link to="/pos" className="text-primary hover:underline font-medium">
                  make your first sale
                </Link>
              </div>
            )}
            {(data?.recentOrders ?? []).map((r: any) => {
              const METHOD_ICON: Record<string, string> = { cash: "💵", mpesa: "📱", card: "💳", other: "🔄" };
              return (
                <div key={r.id} className="py-3 flex items-center gap-3">
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-sm shrink-0">
                    {METHOD_ICON[r.payment_method] ?? "🧾"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{r.receipt_number}</div>
                    <div className="text-xs text-muted-foreground">
                      {(r.profiles as any)?.name ?? "Walk-in"} ·{" "}
                      <span className="capitalize">{r.payment_method}</span>
                    </div>
                  </div>
                  <div className="text-sm font-bold">{fmtMoney(Number(r.total))}</div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Low Stock */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="size-4 text-amber-500" />
            <h2 className="font-semibold text-sm">Low Stock</h2>
          </div>
          <div className="space-y-3">
            {(data?.lowStock ?? []).length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Star className="size-8 mx-auto mb-2 text-emerald-400" />
                All products are stocked up!
              </div>
            ) : (
              <>
                {(data?.lowStock ?? []).map((p: any) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 text-sm overflow-hidden">
                      {p.emoji
                        ? <img src={p.emoji} className="size-8 object-cover rounded-lg" alt="" />
                        : "📦"
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-xs">{p.name}</div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div
                          className="h-1 rounded-full"
                          style={{
                            width: `${Math.min(100, (p.stock / 10) * 100)}%`,
                            background: p.stock === 0 ? "#ef4444" : p.stock <= 3 ? "#f59e0b" : "#10b981",
                          }}
                        />
                      </div>
                    </div>
                    <span className={`text-xs font-bold shrink-0 ${p.stock === 0 ? "text-destructive" : "text-amber-500"}`}>
                      {p.stock === 0 ? "Out!" : `${p.stock}`}
                    </span>
                  </div>
                ))}
                <Link to="/products">
                  <Button variant="outline" size="sm" className="w-full mt-2 text-xs">
                    Manage Inventory
                  </Button>
                </Link>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
