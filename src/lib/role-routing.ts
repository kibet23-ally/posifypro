export type AppRole = string | null | undefined;

export function isSuperAdminRole(role: AppRole) {
  return role === "super_admin";
}

export function getPostLoginRoute(role: AppRole): "/admin" | "/dashboard" {
  return isSuperAdminRole(role) ? "/admin" : "/dashboard";
}