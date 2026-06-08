// src/routes/_app.tsx  ← REPLACE THIS ENTIRE FILE
import {
  createFileRoute, Outlet, Link,
  useNavigate, useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import {
  ShoppingCart, Package, Users, Receipt, Settings,
  LayoutDashboard, LogOut, ShoppingBag,
  UserPlus, Menu, X, ChevronRight, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LicenseGuard from "@/components/LicenseGuard";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const NAV = [
  { to: "/dashboard", label: "Dashboard",    icon: LayoutDashboard },
  { to: "/pos",       label: "Point of Sale", icon: ShoppingCart   },
  { to: "/products",  label: "Products",      icon: Package        },
  { to: "/customers", label: "Customers",     icon: Users          },
  { to: "/sales",     label: "Sales",         icon: Receipt        },
  { to: "/staff",     label: "Staff",         icon: UserPlus       },
  { to: "/settings",  label: "Settings",      icon: Settings       },
] as const;

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const { org, isLifetime, isExpired, trialDaysLeft, loading: orgLoading } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [businessName, setBusinessName] = useState<string | null>(null);
  // null = unchecked, false = not super admin, true = is super admin
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);

  // ── SUPER ADMIN CHECK: runs immediately on mount ──────────
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role, tenants(name)")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role === "super_admin") {
          setIsSuperAdmin(true);
          // Hard redirect — cannot be blocked by router
          window.location.replace("/admin");
        } else {
          setIsSuperAdmin(false);
          const name = (data?.tenants as any)?.name;
          if (name) setBusinessName(name);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Show spinner while: loading auth, loading org,
  // or role check hasn't completed yet, or IS super admin (redirect in progress)
  if (loading || !user || orgLoading || isSuperAdmin === null || isSuperAdmin === true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Redirecting to Admin Panel…" : "Loading your workspace…"}
          </p>
        </div>
      </div>
    );
  }

  const displayName = businessName ?? org?.name ?? "Your Store";
  const currentNav = NAV.find(n => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen flex bg-background" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 h-full z-50 flex flex-col
        w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
        transition-transform duration-250 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:static md:z-auto md:flex
      `}>
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5">
                <Zap className="size-4 text-primary-foreground" />
              </div>
              <span className="font-extrabold text-base tracking-tight">PosifyPro</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground">
              <X className="size-5" />
            </button>
          </div>
          <div className="mt-3 px-1">
            <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-0.5">Business</div>
            <div className="text-sm font-semibold truncate text-sidebar-foreground">{displayName}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-2">Menu</div>
          {NAV.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={`
                group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                transition-all duration-150
                ${active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                }
              `}>
                <n.icon className="size-4 shrink-0" />
                <span className="flex-1 min-w-0">{n.label}</span>
                {active && <ChevronRight className="size-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {!isLifetime && (
          <div className={`mx-3 mb-3 rounded-xl p-3 text-xs ${isExpired ? "bg-destructive/10 border border-destructive/20" : "bg-primary/8 border border-primary/20"}`}>
            <div className={`font-semibold mb-1 ${isExpired ? "text-destructive" : "text-primary"}`}>
              {isExpired ? "⚠ Trial Ended" : `⏳ ${trialDaysLeft} days left`}
            </div>
            <div className="text-muted-foreground mb-2">
              {isExpired ? "Upgrade to continue." : "You're on a free trial."}
            </div>
            <Link to="/pricing">
              <Button size="sm" variant={isExpired ? "destructive" : "default"} className="w-full h-7 text-xs">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        )}

        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg bg-sidebar-accent/30">
            <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-sidebar-foreground">{user.email}</div>
              <div className="text-[10px] text-sidebar-foreground/50">{displayName}</div>
            </div>
          </div>
          <Button
            variant="ghost" size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground gap-2 mt-1"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b bg-background/95 backdrop-blur">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center justify-center size-9 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShoppingBag className="size-3" />
              <span>PosifyPro</span>
              {currentNav && <><ChevronRight className="size-3" /><span className="text-foreground font-medium">{currentNav.label}</span></>}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <LicenseGuard>
            <Outlet />
          </LicenseGuard>
        </main>
      </div>
    </div>
  );
}
