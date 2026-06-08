// src/components/SuperAdminRedirect.tsx
// Drop this component at the TOP of any business page
// It instantly hard-redirects super_admin to /admin
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function SuperAdminRedirect() {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()
        .then(({ data }) => {
          if (data?.role === "super_admin") {
            // Hard redirect — bypasses all router logic
            window.location.replace("/admin");
          }
        });
    });
  }, []);

  return null;
}
