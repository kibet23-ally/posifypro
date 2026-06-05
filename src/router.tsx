import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { supabase } from "@/integrations/supabase/client";

export interface RouterContext {
  queryClient: QueryClient;
  user?: any;
  role?: "super_admin" | "admin" | "cashier" | "user";
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,

    // 👇 IMPORTANT: allow RBAC context injection
    context: {
      queryClient,
      user: undefined,
      role: undefined,
    } satisfies RouterContext,

    // 🔐 Optional but useful for auth-based routing
    async beforeLoad({ context }) {
      const { data } = await supabase.auth.getUser();

      const user = data.user;

      if (!user) {
        return {
          user: undefined,
          role: undefined,
        };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      return {
        user,
        role: profile?.role ?? "user",
      };
    },

    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};