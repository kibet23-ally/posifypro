// src/routes/_app.tsx
import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import {
  ShoppingCart, Package, Users, Receipt, Settings,
  LayoutDashboard, LogOut, ShoppingBag, AlertTriangle,
  UserPlus, Menu, X, ChevronRight, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link as RouterLink } from "@tanstack/react-router";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const NAV = [
  { to: "/dashboard", label: "Dashboard",    icon: LayoutDashboard, desc: "Overview & stats"    },
  { to: "/pos",       label: "Point of Sale", icon: ShoppingCart,    desc: "New sale"            },
  { to: "/products",  label: "Products",      icon: Package,         desc: "Inventory"           },
  { to: "/customers", label: "Customers",     icon: Users,           desc: "Customer list"       },
  { to: "/sales",     label: "Sales",         icon: Receipt,         desc: "Transaction history" },
  { to: "/staff",     label: "Staff",         icon: UserPlus,        desc: "Team management"     },
  { to: "/settings",  label: "Settings",      icon: Settings,        desc: "Account & store"     },
] as const;

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const { org, isLifetime, isTrialActive, isExpired, trialDaysLeft, loading: orgLoading } = useOrg();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", replace: true });
  }, [user, loading, navigate]);

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  if (loading || !user || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  const currentNav = NAV.find(n => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen flex bg-background" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ── SIDEBAR OVERLAY (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-50 flex flex-col
          w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border
          transition-transform duration-250 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:static md:z-auto md:flex
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-sidebar-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary rounded-lg p-1.5">
                <Zap className="size-4 text-primary-foreground" />
              </div>
              <span className="font-extrabold text-base tracking-tight">PosifyPro</span>
            </div>
            {/* Close btn on mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Business name */}
          {org && (
            <div className="mt-3 px-1">
              <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 mb-0.5">Business</div>
              <div className="text-sm font-semibold truncate text-sidebar-foreground">{org.name}</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-sidebar-foreground/40 px-3 mb-2">Menu</div>
          {NAV.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`
                  group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
                  transition-all duration-150 relative
                  ${active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  }
                `}
              >
                <n.icon className="size-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div>{n.label}</div>
                </div>
                {active && <ChevronRight className="size-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* Plan badge */}
        {!isLifetime && (
          <div className={`mx-3 mb-3 rounded-xl p-3 text-xs ${isExpired ? "bg-destructive/10 border border-destructive/20" : "bg-primary/8 border border-primary/20"}`}>
            <div className={`font-semibold mb-1 ${isExpired ? "text-destructive" : "text-primary"}`}>
              {isExpired ? "⚠ Trial Ended" : `⏳ ${trialDaysLeft} days left`}
            </div>
            <div className="text-muted-foreground mb-2">
              {isExpired ? "Upgrade to continue using PosifyPro." : "You're on a free trial."}
            </div>
            <Link to="/pricing">
              <Button size="sm" variant={isExpired ? "destructive" : "default"} className="w-full h-7 text-xs">
                Upgrade Plan
              </Button>
            </Link>
          </div>
        )}

        {/* User footer */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1 rounded-lg bg-sidebar-accent/30">
            <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate text-sidebar-foreground">{user.email}</div>
              <div className="text-[10px] text-sidebar-foreground/50 capitalize">{org?.name ?? "Store"}</div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground gap-2 mt-1"
            onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
          >
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">

        {/* ── TOP BAR ── */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Hamburger — always visible */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="flex items-center justify-center size-9 rounded-lg border border-border hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen
              ? <X className="size-4" />
              : <Menu className="size-4" />
            }
          </button>

          {/* Page title + breadcrumb */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShoppingBag className="size-3" />
              <span>PosifyPro</span>
              {currentNav && (
                <>
                  <ChevronRight className="size-3" />
                  <span className="text-foreground font-medium">{currentNav.label}</span>
                </>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
              {" · "}
              {new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            {/* Trial warning chip */}
            {!isLifetime && isExpired && (
              <Link to="/pricing">
                <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg border border-destructive/20">
                  <AlertTriangle className="size-3" /> Trial ended
                </div>
              </Link>
            )}
            {!isLifetime && isTrialActive && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/8 px-3 py-1.5 rounded-lg border border-primary/20">
                ⏳ {trialDaysLeft}d left
              </div>
            )}
            {/* Quick sale button */}
            <Link to="/pos">
              <Button size="sm" className="h-8 gap-1.5 text-xs">
                <ShoppingCart className="size-3.5" /> New Sale
              </Button>
            </Link>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
