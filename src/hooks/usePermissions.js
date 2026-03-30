import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ROLE_PRESETS } from "@/lib/permissions";

/**
 * Resolves permissions for the current user.
 *
 * Priority order:
 *  1. Built-in "admin" base44 role → always gets all permissions
 *  2. Custom Role record whose name matches user.role → use its permissions array
 *  3. Preset lookup by role name (foreman, manager, etc.)
 *  4. Fall back to ROLE_PRESETS.laborer (minimum access)
 */
export function usePermissions() {
  const { user } = useAuth();
  const userRole = user?.role || "user";
  const isSystemAdmin = userRole === "admin";

  // Fetch custom roles so we can match by name
  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list(),
    staleTime: 60_000,
    enabled: !isSystemAdmin, // admins skip this
  });

  // Build the permissions Set
  const permSet = (() => {
    if (isSystemAdmin) {
      // Full access — include everything from all presets
      return new Set(Object.values(ROLE_PRESETS).flatMap(p => p.permissions));
    }

    // Try to find a custom Role record whose name matches (case-insensitive)
    const customRole = roles.find(r => r.name?.toLowerCase() === userRole.toLowerCase());
    if (customRole?.permissions?.length) {
      return new Set(customRole.permissions);
    }

    // Try preset lookup by role name key
    const preset = ROLE_PRESETS[userRole.toLowerCase()];
    if (preset) return new Set(preset.permissions);

    // Default: user → foreman-level (view jobs, schedule, timesheets)
    return new Set(ROLE_PRESETS.laborer?.permissions || [
      "jobs.view", "schedule.view", "timesheets.view", "timesheets.create",
    ]);
  })();

  function can(permission) { return permSet.has(permission); }
  function canAny(...permissions) { return permissions.some(p => permSet.has(p)); }
  function canAll(...permissions) { return permissions.every(p => permSet.has(p)); }

  return {
    can,
    canAny,
    canAll,
    role: userRole,
    isAdmin: isSystemAdmin,
    permissions: permSet,
  };
}