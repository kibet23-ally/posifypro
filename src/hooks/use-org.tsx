// src/hooks/use-org.tsx
// Updated to use `tenants` table instead of `organizations`
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

  // tenant_id comes from our multi-tenant profiles table
  const tenantId = profile?.tenant_id ?? null;

  const { data: org, isLoading: orgLoading } = useQuery({
    enabled: !!tenantId,
    queryKey: ["tenant", tenantId],
    queryFn: async () =>
      (await supabase.from("tenants").select("*").eq("id", tenantId!).maybeSingle()).data,
  });

  // Map tenants fields to what the app expects
  // tenants.plan: 'free' | 'basic' | 'pro'
  // We treat 'pro' as lifetime, 'basic'/'free' as trial-like
  const isLifetime = org?.plan === "pro";
  const isTrialActive = org?.plan === "basic" && org?.is_active === true;
  const isExpired = !isLifetime && !isTrialActive && !!org;
  const trialDaysLeft = isTrialActive ? 30 : 0; // basic plan = 30 day rolling

  return {
    profile,
    orgId: tenantId,      // keep orgId alias so existing code doesn't break
    tenantId,
    org: org ? {
      ...org,
      name: org.name,
      // map to fields products page expects
      license_status: org.plan === "pro" ? "lifetime" : org.plan === "basic" ? "trial" : "expired",
      license_expires_at: null,
    } : null,
    loading: profileLoading || orgLoading,
    isLifetime,
    isTrialActive: isLifetime || isTrialActive, // pro = always active
    isExpired: !org?.is_active,
    trialDaysLeft,
    role: profile?.role ?? "cashier",
  };
}
