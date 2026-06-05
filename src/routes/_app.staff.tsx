// src/routes/_app.staff.tsx
// Staff list — invite system is disabled until the schema is wired up.
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Users, Crown, Shield, UserCheck } from "lucide-react";

export const Route = createFileRoute("/_app/staff")({ component: StaffPage });

type Role = "owner" | "manager" | "cashier" | string;

interface StaffMember {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  is_active: boolean | null;
  created_at: string | null;
}

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  owner:   { label: "Owner",   icon: Crown,       color: "text-amber-500",   bg: "bg-amber-50",   border: "border-amber-200" },
  manager: { label: "Manager", icon: Shield,      color: "text-blue-500",    bg: "bg-blue-50",    border: "border-blue-200" },
  cashier: { label: "Cashier", icon: UserCheck,   color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
};

function RoleBadge({ role }: { role: Role }) {
  const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.cashier;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon className="size-3" /> {cfg.label}
    </span>
  );
}

function StaffPage() {
  const { user } = useAuth();
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data?.org_id) setOrgId(data.org_id); });
  }, [user]);

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("org_id", orgId!)
        .order("created_at");
      return (data ?? []) as unknown as StaffMember[];
    },
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Users className="size-5" /> Staff
          </h1>
          <p className="text-sm text-muted-foreground">
            {staff.length} member{staff.length === 1 ? "" : "s"} in your team
          </p>
        </div>
        <Button disabled title="Invites coming soon">Invite staff (soon)</Button>
      </div>

      <Card className="p-2">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">No staff yet.</div>
        ) : (
          <div className="divide-y">
            {staff.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                  {m.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{m.name ?? "(no name)"}</div>
                  <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                </div>
                <RoleBadge role={m.role} />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
