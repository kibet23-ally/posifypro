import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { ShoppingCart, Package, Users, Receipt, Settings, LayoutDashboard, LogOut, ShoppingBag, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const { org, isLifetime, isTrialActive, isExpired, trialDaysLeft, loading: orgLoading } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  if (loading || !user || orgLoading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex w-60 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <div className="p-5 flex items-center gap-2 text-lg font-semibold">
          <ShoppingBag className="size-5 text-primary" />
          POSify Pro
        </div>
        {org && (
          <div className="px-5 pb-3 -mt-2">
            <div className="text-xs text-sidebar-foreground/50">Business</div>
            <div className="text-sm font-medium truncate">{org.name}</div>
          </div>
        )}
        <nav className="flex-1 px-3 space-y-1">
          {nav.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"}`}>
                <n.icon className="size-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="px-3 py-2 text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-3 border-b bg-sidebar text-sidebar-foreground">
          <div className="flex items-center gap-2 font-semibold"><ShoppingBag className="size-5 text-primary" />POSify Pro</div>
          <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}><LogOut className="size-4" /></Button>
        </header>

        {!isLifetime && (
          <div className={`px-4 py-2 text-sm flex items-center justify-between gap-3 ${isExpired ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning-foreground"}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              {isExpired
                ? "Your free trial has ended. Upgrade to keep using POSify Pro."
                : `Free trial: ${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left.`}
            </div>
            <Link to="/pricing"><Button size="sm" variant={isExpired ? "destructive" : "default"}>Upgrade</Button></Link>
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <nav className="md:hidden grid grid-cols-5 border-t bg-card">
          {nav.filter(n => n.to !== "/settings").map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-1 py-2 text-[10px] ${active ? "text-primary" : "text-muted-foreground"}`}>
                <n.icon className="size-5" /> {n.label.split(" ")[0]}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
