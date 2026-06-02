// src/routes/_app.staff.tsx
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Users, UserPlus, Mail, Phone, Shield, Trash2,
  Crown, UserCheck, UserX, Copy, Check, X
} from "lucide-react";

export const Route = createFileRoute("/_app/staff")({ component: StaffPage });

// -------------------------------------------------------
// Types
// -------------------------------------------------------
type Role = "owner" | "manager" | "cashier";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
  created_at: string;
}

// -------------------------------------------------------
// Role config
// -------------------------------------------------------
const ROLE_CONFIG = {
  owner: { label: "Owner", icon: Crown, color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-200" },
  manager: { label: "Manager", icon: Shield, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-200" },
  cashier: { label: "Cashier", icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-200" },
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

// -------------------------------------------------------
// Invite Link Copier
// -------------------------------------------------------
function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/accept-invite?token=${token}`;

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      {copied ? "Copied!" : "Copy invite link"}
    </button>
  );
}

// -------------------------------------------------------
// Invite Modal
// -------------------------------------------------------
function InviteModal({
  tenantId,
  invitedBy,
  onClose,
  onSuccess,
}: {
  tenantId: string;
  invitedBy: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "cashier">("cashier");
  const [busy, setBusy] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) { toast.error("Enter an email address"); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { toast.error("Enter a valid email"); return; }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("staff_invites")
        .insert({
          email: email.toLowerCase().trim(),
          role,
          tenant_id: tenantId,
          invited_by: invitedBy,
        });

      if (error) throw error;
      toast.success(`Invite sent to ${email}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to send invite");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold">Invite Staff Member</h2>
            <p className="text-sm text-muted-foreground">They'll receive a link to join your store</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["cashier", "manager"] as const).map(r => {
                const cfg = ROLE_CONFIG[r];
                const Icon = cfg.icon;
                return (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      role === r
                        ? `${cfg.bg} ${cfg.border} ${cfg.color}`
                        : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <Icon className="size-4" />
                    <div className="text-left">
                      <div>{cfg.label}</div>
                      <div className="text-xs font-normal opacity-70">
                        {r === "cashier" ? "Can make sales" : "Can manage products"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button onClick={handleInvite} disabled={busy} className="w-full">
            {busy ? "Sending…" : "Send Invite"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

// -------------------------------------------------------
// Main Staff Page
// -------------------------------------------------------
function StaffPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);

  // Get current user's tenant + role
  useState(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("tenant_id, id, role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setTenantId(data.tenant_id);
          setMyId(data.id);
          setMyRole(data.role as Role);
        }
      });
  });

  // Fetch staff members
  const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ["staff", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("tenant_id", tenantId!)
        .order("created_at");
      return (data ?? []) as StaffMember[];
    },
  });

  // Fetch pending invites
  const { data: invites = [], isLoading: invitesLoading } = useQuery<PendingInvite[]>({
    queryKey: ["staff-invites", tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_invites")
        .select("*")
        .eq("tenant_id", tenantId!)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return (data ?? []) as PendingInvite[];
    },
  });

  // Toggle staff active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
      toast.success("Staff status updated");
    },
    onError: () => toast.error("Failed to update status"),
  });

  // Change role
  const changeRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: Role }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });

  // Cancel invite
  const cancelInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff_invites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-invites", tenantId] });
      toast.success("Invite cancelled");
    },
  });

  const canManageStaff = myRole === "owner" || myRole === "manager";

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["staff", tenantId] });
    queryClient.invalidateQueries({ queryKey: ["staff-invites", tenantId] });
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {staff.length} member{staff.length !== 1 ? "s" : ""} · {invites.length} pending invite{invites.length !== 1 ? "s" : ""}
          </p>
        </div>
        {canManageStaff && (
          <Button onClick={() => setShowInviteModal(true)} className="gap-2">
            <UserPlus className="size-4" /> Invite Staff
          </Button>
        )}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {(["owner", "manager", "cashier"] as Role[]).map(role => {
          const count = staff.filter(s => s.role === role).length;
          const cfg = ROLE_CONFIG[role];
          const Icon = cfg.icon;
          return (
            <Card key={role} className={`p-4 border ${cfg.border}`}>
              <div className={`inline-flex p-2 rounded-lg ${cfg.bg} mb-2`}>
                <Icon className={`size-4 ${cfg.color}`} />
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">{cfg.label}{count !== 1 ? "s" : ""}</div>
            </Card>
          );
        })}
      </div>

      {/* Staff List */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Team Members
        </h2>
        {staffLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Users className="size-10 mx-auto mb-2 opacity-30" />
            <p>No staff yet. Invite your first team member!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {staff.map(member => {
              const isMe = member.id === myId;
              const isOwner = member.role === "owner";
              return (
                <Card key={member.id} className={`p-4 ${!member.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className={`size-10 rounded-full flex items-center justify-center text-sm font-bold ${ROLE_CONFIG[member.role]?.bg ?? "bg-muted"} ${ROLE_CONFIG[member.role]?.color ?? ""} shrink-0`}>
                      {member.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{member.full_name}</span>
                        {isMe && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">You</span>
                        )}
                        {!member.is_active && (
                          <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded font-medium">Suspended</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Mail className="size-3" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <RoleBadge role={member.role} />

                    {/* Actions — only owner/manager can manage, can't edit yourself or owner */}
                    {canManageStaff && !isMe && !isOwner && (
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Change role */}
                        <select
                          value={member.role}
                          onChange={e => changeRole.mutate({ id: member.id, role: e.target.value as Role })}
                          className="text-xs border rounded px-1.5 py-1 bg-background"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="cashier">Cashier</option>
                          <option value="manager">Manager</option>
                        </select>

                        {/* Suspend / Activate */}
                        <button
                          onClick={() => toggleActive.mutate({ id: member.id, is_active: member.is_active })}
                          className={`p-1.5 rounded-lg transition-colors ${member.is_active ? "text-destructive hover:bg-destructive/10" : "text-emerald-500 hover:bg-emerald-50"}`}
                          title={member.is_active ? "Suspend" : "Activate"}
                        >
                          {member.is_active ? <UserX className="size-4" /> : <UserCheck className="size-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Pending Invites
          </h2>
          <div className="space-y-2">
            {invites.map(invite => {
              const expiresIn = Math.ceil(
                (new Date(invite.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Card key={invite.id} className="p-4 border-dashed">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <Mail className="size-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{invite.email}</span>
                        <RoleBadge role={invite.role} />
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground">
                          Expires in {expiresIn} day{expiresIn !== 1 ? "s" : ""}
                        </span>
                        <InviteLink token={invite.token} />
                      </div>
                    </div>
                    {canManageStaff && (
                      <button
                        onClick={() => cancelInvite.mutate(invite.id)}
                        className="text-muted-foreground hover:text-destructive p-1.5 rounded"
                        title="Cancel invite"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && tenantId && myId && (
        <InviteModal
          tenantId={tenantId}
          invitedBy={myId}
          onClose={() => setShowInviteModal(false)}
          onSuccess={refreshAll}
        />
      )}
    </div>
  );
}
