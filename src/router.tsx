// src/router.tsx
import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { supabase } from "@/integrations/supabase/client";

export const queryClient = new QueryClient();

export const router = createRouter({
  routeTree,
  context: {
    queryClient,
    auth: {
      supabase,
    },
  },
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
});

// Important for TS
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}