// src/routes/_app.tsx
import {
  createFileRoute,
  Outlet,
  Link,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOrg } from "@/hooks/use-org";
import { supabase } from "@/integrations/supabase/client";
import LicenseGuard from "@/components/LicenseGuard";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  Settings,
  UserPlus,
  Menu,
  X,
  ChevronRight,
  Zap,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { to: "/products", label: "Products", icon: Package },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/staff", label: "Staff", icon: UserPlus },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function AppLayout() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { org, loading: orgLoading } = useOrg();

  const [role, setRole] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get role
  useEffect(() => {
    if (!user) return;

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setRole(data?.role ?? null);
      });
  }, [user]);

  // RBAC REDIRECT FIX 🔥
  useEffect(() => {
    if (loading || !user || !role) return;

    if (role === "super_admin") {
      navigate({ to: "/admin", replace: true });
    }
  }, [user, role, loading, navigate]);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading || !user || orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  const currentNav = NAV.find((n) =>
    location.pathname.startsWith(n.to)
  );

  return (
    <div className="min-h-screen flex bg-background">

      {/* Sidebar */}
      <aside className={`fixed md:static z-50 w-64 bg-sidebar border-r
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        transition-transform`}>
        
        <div className="p-4 border-b">
          <div className="flex items-center gap-2 font-bold">
            <Zap className="size-4" />
            PosifyPro
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {NAV.map((n) => {
            const active = location.pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex items-center gap-2 p-2 rounded ${
                  active ? "bg-primary text-white" : "hover:bg-muted"
                }`}
              >
                <n.icon className="size-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t">
          <Button
            onClick={async () => {
              await signOut();
              navigate({ to: "/login" });
            }}
            className="w-full"
          >
            <LogOut className="size-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="h-14 border-b flex items-center px-4 gap-2">
          <button onClick={() => setSidebarOpen((v) => !v)}>
            {sidebarOpen ? <X /> : <Menu />}
          </button>

          <div className="text-sm font-medium">
            {currentNav?.label ?? "Dashboard"}
          </div>
        </header>

        <main className="flex-1 p-4">
          <LicenseGuard>
            <Outlet />
          </LicenseGuard>
        </main>
      </div>
    </div>
  );
}