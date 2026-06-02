import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export function useOrg() {
  const { user } = useAuth();
  const { data: profile, isLoading: profileLoading } = useQuery({
    enabled: !!user,
    queryKey: ["profile", user?.id],
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const orgId = profile?.org_id ?? null;

  const { data: org, isLoading: orgLoading } = useQuery({
    enabled: !!orgId,
    queryKey: ["organization", orgId],
    queryFn: async () =>
      (await supabase.from("organizations").select("*").eq("id", orgId!).maybeSingle()).data,
  });

  const now = Date.now();
  const expiresAt = org?.license_expires_at ? new Date(org.license_expires_at).getTime() : null;
  const isLifetime = org?.license_status === "lifetime";
  const isTrialActive = org?.license_status === "trial" && expiresAt !== null && expiresAt > now;
  const isExpired = !isLifetime && !isTrialActive;
  const trialDaysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / 86400000)) : 0;

  return {
    profile,
    orgId,
    org,
    loading: profileLoading || orgLoading,
    isLifetime,
    isTrialActive,
    isExpired,
    trialDaysLeft,
    role: profile?.role ?? "cashier",
  };
}
