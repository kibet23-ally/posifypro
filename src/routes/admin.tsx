import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ context, navigate }) => {
    const { user } = context.auth;

    if (!user) {
      throw navigate({ to: "/login" });
    }

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (data?.role !== "super_admin") {
      throw navigate({ to: "/dashboard" });
    }
  },

  component: SuperAdminDashboard,
});