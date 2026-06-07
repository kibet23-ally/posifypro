import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Building2, Shield, Settings, LogOut,
  TrendingUp, DollarSign, UserCheck
} from "lucide-react";

export const Route = createFileRoute("/admin")({ component: SuperAdminDashboard });

function SuperAdminDashboard() {
  console.log("✅ Super Admin Dashboard Mounted!");   // ← Debug line

  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Optional: Redirect back if not super admin
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "super_admin") {
          navigate({ to: "/dashboard", replace: true });
        }
      });
  }, [user, navigate]);

  // Optional: Redirect back if not super admin
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "super_admin") {
          navigate({ to: "/dashboard", replace: true });
        }
      });
  }, [user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Super Admin Panel</h1>
            <p className="text-muted-foreground mt-1">Welcome back, {user?.email}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 size-4" /> Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Building2 className="size-8 text-blue-600" />
              </div>
              <div>
                <div className="text-3xl font-bold">12</div>
                <div className="text-sm text-muted-foreground">Total Businesses</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-xl">
                <Users className="size-8 text-green-600" />
              </div>
              <div>
                <div className="text-3xl font-bold">248</div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-xl">
                <Shield className="size-8 text-purple-600" />
              </div>
              <div>
                <div className="text-3xl font-bold">3</div>
                <div className="text-sm text-muted-foreground">Active Trials</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="mt-10">
          <h2 className="text-xl font-semibold mb-4">Management</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/admin/tenants">
              <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <Building2 className="size-10 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">Manage Businesses</h3>
                    <p className="text-sm text-muted-foreground">View, suspend, or delete tenants</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/admin/users">
              <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <UserCheck className="size-10 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">Manage Users</h3>
                    <p className="text-sm text-muted-foreground">Global user management</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link to="/admin/settings">
              <Card className="p-6 hover:bg-accent cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <Settings className="size-10 text-primary" />
                  <div>
                    <h3 className="font-semibold text-lg">System Settings</h3>
                    <p className="text-sm text-muted-foreground">Global configuration</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}