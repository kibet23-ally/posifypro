// src/hooks/use-org.tsx
// Reads the user's organization from the actual `organizations` schema.
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

  const orgId = (profile as any)?.org_id ?? null;

  const { data: org, isLoading: orgLoading } = useQuery({
    enabled: !!orgId,
    queryKey: ["organization", orgId],
    queryFn: async () =>
      (await supabase.from("organizations").select("*").eq("id", orgId!).maybeSingle()).data,
  });

  const status = (org as any)?.license_status ?? "trial";
  const expiresAt = (org as any)?.license_expires_at
    ? new Date((org as any).license_expires_at)
    : null;

  const isLifetime = status === "lifetime";
  const isActivePaid = status === "active";
  const now = new Date();
  const isTrial = status === "trial";
  const trialNotExpired = isTrial && (!expiresAt || expiresAt > now);
  const isExpired =
    status === "expired" || (isTrial && expiresAt !== null && expiresAt <= now);

  const trialDaysLeft =
    isTrial && expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000))
      : 0;

  return {
    profile,
    orgId,
    tenantId: orgId, // back-compat alias
    org: org
      ? {
          ...(org as any),
          // expose a couple of compatibility fields used in older code
          license_plan: status,
          plan: status,
          is_active: !isExpired,
        }
      : null,
    loading: profileLoading || orgLoading,
    isLifetime,
    isTrialActive: isLifetime || isActivePaid || trialNotExpired,
    isExpired,
    trialDaysLeft,
    role: (profile as any)?.role ?? "cashier",
  };
}
