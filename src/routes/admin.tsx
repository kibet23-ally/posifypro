import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminRoute,
});

function AdminRoute() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (role !== "super_admin") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [user, role, loading, navigate]);

  if (loading || !user || role !== "super_admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return <SuperAdminDashboard />;
}