import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type OrganizationUpdate = Database["public"]["Tables"]["organizations"]["Update"];

const planSchema = z.enum(["free", "basic", "pro", "enterprise"]);
const licenseStatusSchema = z.enum(["trial", "active", "lifetime", "expired"]);

async function getAdminClientForSuperAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  if (profile?.role !== "super_admin") throw new Error("Unauthorized");

  return supabaseAdmin;
}

function planFromStatus(status: string | null | undefined) {
  if (status === "lifetime") return "pro";
  if (status === "active") return "basic";
  return "free";
}

function statusFromPlan(plan: z.infer<typeof planSchema>) {
  if (plan === "pro" || plan === "enterprise") return "lifetime";
  if (plan === "basic") return "active";
  return "trial";
}

export const getSuperAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabaseAdmin = await getAdminClientForSuperAdmin(context.userId);

    const [orgsRes, profilesRes, salesRes] = await Promise.all([
      supabaseAdmin
        .from("organizations")
        .select("id, name, owner_id, license_status, license_expires_at, purchased_at, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("profiles")
        .select("id, name, email, role, org_id, is_active, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("sales").select("id, org_id"),
    ]);

    if (orgsRes.error) throw orgsRes.error;
    if (profilesRes.error) throw profilesRes.error;
    if (salesRes.error) throw salesRes.error;

    const organizations = orgsRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const sales = salesRes.data ?? [];
    const orgById = new Map(organizations.map((org) => [org.id, org]));

    const staffCountByOrg = profiles.reduce<Record<string, number>>((acc, profile) => {
      if (profile.org_id && profile.role !== "super_admin") {
        acc[profile.org_id] = (acc[profile.org_id] ?? 0) + 1;
      }
      return acc;
    }, {});

    const salesCountByOrg = sales.reduce<Record<string, number>>((acc, sale) => {
      if (sale.org_id) acc[sale.org_id] = (acc[sale.org_id] ?? 0) + 1;
      return acc;
    }, {});

    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

    return {
      businesses: organizations.map((org) => {
        const owner = profileById.get(org.owner_id);
        const status = org.license_status ?? "trial";
        return {
          id: org.id,
          name: org.name,
          email: owner?.email ?? null,
          owner_name: owner?.name ?? null,
          owner_id: org.owner_id,
          license_status: status,
          plan: planFromStatus(status),
          is_active: status !== "expired",
          created_at: org.created_at,
          staff_count: staffCountByOrg[org.id] ?? 0,
          order_count: salesCountByOrg[org.id] ?? 0,
        };
      }),
      staff: profiles
        .filter((profile) => profile.role !== "super_admin")
        .map((profile) => ({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          org_id: profile.org_id,
          business_name: profile.org_id ? orgById.get(profile.org_id)?.name ?? null : null,
          is_active: profile.is_active,
          created_at: profile.created_at,
        })),
    };
  });

export const setBusinessStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ orgId: z.string().uuid(), licenseStatus: licenseStatusSchema }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await getAdminClientForSuperAdmin(context.userId);
    const payload: OrganizationUpdate = { license_status: data.licenseStatus };

    if (data.licenseStatus === "active" || data.licenseStatus === "lifetime") {
      payload.purchased_at = new Date().toISOString();
    }
    if (data.licenseStatus === "expired") {
      payload.license_expires_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("organizations")
      .update(payload)
      .eq("id", data.orgId);

    if (error) throw error;
    return { ok: true };
  });

export const setBusinessPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ orgId: z.string().uuid(), plan: planSchema }).parse(data))
  .handler(async ({ data, context }) => {
    const supabaseAdmin = await getAdminClientForSuperAdmin(context.userId);
    const nextStatus = statusFromPlan(data.plan);
    const payload: OrganizationUpdate = { license_status: nextStatus };

    if (nextStatus === "active" || nextStatus === "lifetime") {
      payload.purchased_at = new Date().toISOString();
    }

    const { error } = await supabaseAdmin
      .from("organizations")
      .update(payload)
      .eq("id", data.orgId);

    if (error) throw error;
    return { ok: true };
  });