// src/pages/SuperAdminDashboard.tsx
// Clean, responsive super-admin dashboard with shadcn Sidebar.
import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { signOut as doSignOut } from "@/lib/auth";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Building2,
  Users,
  LogOut,
  Search,
  Shield,
  CheckCircle2,
  XCircle,
  Crown,
  Sparkles,
  RefreshCw,
} from "lucide-react";

type Plan = "free" | "basic" | "pro";
type StatusFilter = "all" | "active" | "suspended";
type PlanFilter = "all" | Plan;

interface OrgRow {
  id: string;
  name: string;
  owner_email: string;
  plan: Plan;
  license_status: string;
  is_active: boolean;
  created_at: string;
  staff_count: number;
  sales_count: number;
}

interface StaffRow {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  is_active: boolean | null;
  org_name: string | null;
}

const statusToPlan = (s: string | null): Plan =>
  s === "lifetime" ? "pro" : s === "active" ? "basic" : "free";

const planToStatus = (p: Plan): string =>
  p === "pro" ? "lifetime" : p === "basic" ? "active" : "trial";

const planBadge = (p: Plan) =>
  p === "pro"
    ? "bg-amber-100 text-amber-700 border-amber-200"
    : p === "basic"
      ? "bg-blue-100 text-blue-700 border-blue-200"
      : "bg-slate-100 text-slate-600 border-slate-200";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const currentPath = useRouterState({ select: (s) => s.location.pathname });

  const [tab, setTab] = useState<"overview" | "businesses" | "staff">("overview");
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [staffSearch, setStaffSearch] = useState("");

  // Guard: only super_admin can view this page
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "super_admin") navigate({ to: "/dashboard" });
      });
  }, [user, navigate]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data: orgRows } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (!orgRows) {
        setOrgs([]);
        return;
      }

      const enriched: OrgRow[] = await Promise.all(
        (orgRows as any[]).map(async (o) => {
          const [staffCount, salesCount, owner] = await Promise.all([
            supabase
              .from("organization_members")
              .select("user_id", { count: "exact", head: true })
              .eq("org_id", o.id),
            supabase
              .from("sales")
              .select("id", { count: "exact", head: true })
              .eq("org_id", o.id),
            supabase
              .from("profiles")
              .select("email")
              .eq("id", o.owner_id)
              .maybeSingle(),
          ]);
          return {
            id: o.id,
            name: o.name,
            owner_email: (owner.data as any)?.email ?? "—",
            plan: statusToPlan(o.license_status),
            license_status: o.license_status ?? "trial",
            is_active: o.license_status !== "expired",
            created_at: o.created_at,
            staff_count: staffCount.count ?? 0,
            sales_count: salesCount.count ?? 0,
          };
        }),
      );
      setOrgs(enriched);

      const { data: staffData } = await supabase
        .from("profiles")
        .select("id, name, email, role, is_active, organizations:org_id(name)")
        .neq("role", "super_admin")
        .order("created_at", { ascending: false });

      setStaff(
        ((staffData as any[]) ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          role: s.role,
          is_active: s.is_active,
          org_name: s.organizations?.name ?? null,
        })),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSignOut = async () => {
    await doSignOut();
    navigate({ to: "/login" });
  };

  const togglePlan = async (org: OrgRow, plan: Plan) => {
    const { error } = await supabase
      .from("organizations")
      .update({ license_status: planToStatus(plan) } as any)
      .eq("id", org.id);
    if (error) return toast.error(error.message);
    toast.success(`${org.name} → ${plan.toUpperCase()}`);
    load();
  };

  const toggleStatus = async (org: OrgRow) => {
    const next = org.is_active ? "expired" : "active";
    const { error } = await supabase
      .from("organizations")
      .update({ license_status: next } as any)
      .eq("id", org.id);
    if (error) return toast.error(error.message);
    toast.success(org.is_active ? "Suspended" : "Activated");
    load();
  };

  const kpis = useMemo(() => {
    const total = orgs.length;
    const active = orgs.filter((o) => o.is_active).length;
    const suspended = total - active;
    const pro = orgs.filter((o) => o.plan === "pro").length;
    const basic = orgs.filter((o) => o.plan === "basic").length;
    const ms = new Date();
    ms.setDate(1);
    const newThisMonth = orgs.filter((o) => new Date(o.created_at) >= ms).length;
    return { total, active, suspended, pro, basic, newThisMonth, staff: staff.length };
  }, [orgs, staff.length]);

  const filteredOrgs = orgs.filter((o) => {
    const q = search.toLowerCase();
    const matchQ =
      !q || o.name.toLowerCase().includes(q) || o.owner_email.toLowerCase().includes(q);
    const matchPlan = planFilter === "all" || o.plan === planFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" ? o.is_active : !o.is_active);
    return matchQ && matchPlan && matchStatus;
  });

  const filteredStaff = staff.filter((s) => {
    const q = staffSearch.toLowerCase();
    return (
      !q ||
      s.name?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q) ||
      s.org_name?.toLowerCase().includes(q)
    );
  });

  const navItems = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "businesses" as const, label: "Businesses", icon: Building2 },
    { id: "staff" as const, label: "All Staff", icon: Users },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar collapsible="icon">
          <SidebarHeader className="border-b">
            <div className="flex items-center gap-2 px-2 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold">PosifyPro</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                  Super Admin
                </span>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Manage</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        isActive={tab === item.id}
                        onClick={() => setTab(item.id)}
                        tooltip={item.label}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Shortcuts</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="My Business">
                      <Link to="/dashboard" className="flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>My Business</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t">
            <div className="px-2 py-2 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Sign out">
                  <LogOut className="h-4 w-4" />
                  <span>Sign out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background px-4">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" />
              <h1 className="text-sm font-semibold">
                Super Admin · {navItems.find((n) => n.id === tab)?.label}
              </h1>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="hidden sm:inline-flex">
                {kpis.active} active
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => load()}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </header>

          <main className="flex-1 space-y-6 p-4 md:p-6">
            {tab === "overview" && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <KCard label="Total Businesses" value={kpis.total} icon={Building2} tone="indigo" />
                  <KCard label="Active" value={kpis.active} icon={CheckCircle2} tone="emerald" />
                  <KCard label="Suspended" value={kpis.suspended} icon={XCircle} tone="rose" />
                  <KCard label="Pro Plans" value={kpis.pro} icon={Crown} tone="amber" />
                  <KCard label="Basic Plans" value={kpis.basic} icon={Sparkles} tone="blue" />
                  <KCard label="Total Staff" value={kpis.staff} icon={Users} tone="violet" />
                  <KCard label="New (Month)" value={kpis.newThisMonth} icon={Building2} tone="emerald" />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Businesses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>
                    ) : orgs.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">No businesses yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {orgs.slice(0, 6).map((o) => (
                          <div
                            key={o.id}
                            className="flex items-center justify-between rounded-lg border bg-card p-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                                {o.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{o.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{o.owner_email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={planBadge(o.plan)}>
                                {o.plan.toUpperCase()}
                              </Badge>
                              <Badge variant={o.is_active ? "default" : "destructive"}>
                                {o.is_active ? "Active" : "Suspended"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {tab === "businesses" && (
              <Card>
                <CardHeader className="space-y-3">
                  <CardTitle className="text-base">All Businesses ({filteredOrgs.length})</CardTitle>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or owner email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={planFilter} onValueChange={(v) => setPlanFilter(v as PlanFilter)}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All plans</SelectItem>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={statusFilter}
                      onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                    >
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Business</TableHead>
                        <TableHead className="hidden md:table-cell">Owner</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Staff</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Sales</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredOrgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                            No businesses match the filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredOrgs.map((o) => (
                          <TableRow key={o.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
                                  {o.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{o.name}</p>
                                  <p className="text-xs text-muted-foreground md:hidden">
                                    {o.owner_email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">
                              {o.owner_email}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              {o.staff_count}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              {o.sales_count}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={o.plan}
                                onValueChange={(v) => togglePlan(o, v as Plan)}
                              >
                                <SelectTrigger className="h-8 w-[90px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="free">Free</SelectItem>
                                  <SelectItem value="basic">Basic</SelectItem>
                                  <SelectItem value="pro">Pro</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant={o.is_active ? "destructive" : "default"}
                                onClick={() => toggleStatus(o)}
                              >
                                {o.is_active ? "Suspend" : "Activate"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {tab === "staff" && (
              <Card>
                <CardHeader className="space-y-3">
                  <CardTitle className="text-base">All Staff ({filteredStaff.length})</CardTitle>
                  <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search staff…"
                      value={staffSearch}
                      onChange={(e) => setStaffSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Email</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                            No staff found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStaff.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <p className="text-sm font-medium">{s.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground md:hidden">{s.email}</p>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm">{s.email}</TableCell>
                            <TableCell className="text-sm">{s.org_name ?? "—"}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {s.role ?? "—"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function KCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: any;
  tone: "indigo" | "emerald" | "rose" | "amber" | "blue" | "violet";
}) {
  const toneClass: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    amber: "bg-amber-100 text-amber-700",
    blue: "bg-blue-100 text-blue-700",
    violet: "bg-violet-100 text-violet-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClass[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight">{value}</p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
