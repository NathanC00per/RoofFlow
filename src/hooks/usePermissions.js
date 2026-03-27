import { useAuth } from "@/lib/AuthContext";

/**
 * Role hierarchy:
 *   admin  → full access
 *   user   → read + limited create/edit, no delete/settings
 */
const PERMISSIONS = {
  admin: [
    "jobs.create", "jobs.edit", "jobs.delete",
    "estimates.create", "estimates.edit", "estimates.delete",
    "invoices.create", "invoices.edit", "invoices.delete",
    "employees.create", "employees.edit", "employees.delete",
    "customers.create", "customers.edit", "customers.delete",
    "materials.create", "materials.edit", "materials.delete",
    "expenses.create", "expenses.edit", "expenses.delete",
    "timesheets.create", "timesheets.edit", "timesheets.delete", "timesheets.approve",
    "settings.view", "settings.edit",
    "finance.view",
  ],
  user: [
    "jobs.create", "jobs.edit",
    "estimates.create", "estimates.edit",
    "invoices.create", "invoices.edit",
    "customers.create", "customers.edit",
    "materials.create",
    "expenses.create", "expenses.edit",
    "timesheets.create", "timesheets.edit",
    "finance.view",
  ],
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || "user";

  function can(permission) {
    const allowed = PERMISSIONS[role] || PERMISSIONS["user"];
    return allowed.includes(permission);
  }

  function canAny(...permissions) {
    return permissions.some(p => can(p));
  }

  function canAll(...permissions) {
    return permissions.every(p => can(p));
  }

  return { can, canAny, canAll, role, isAdmin: role === "admin" };
}