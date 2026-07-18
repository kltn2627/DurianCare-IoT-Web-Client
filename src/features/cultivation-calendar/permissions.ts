import type { AuthRole } from "@/lib/auth/types";

export type CultivationPermission =
  | "CULTIVATION_PLAN_VIEW"
  | "CULTIVATION_PLAN_MANAGE"
  | "CULTIVATION_ACTIVITY_EXECUTE"
  | "CHEMICAL_APPLICATION_REQUEST"
  | "CHEMICAL_APPLICATION_APPROVE"
  | "RESIDUE_STANDARD_MANAGE"
  | "LAB_RESULT_MANAGE"
  | "HARVEST_BATCH_MANAGE"
  | "EXPORT_RELEASE_REVIEW"
  | "EXPORT_RELEASE_APPROVE"
  | "AUDIT_LOG_VIEW";

const rolePermissions: Record<AuthRole, CultivationPermission[]> = {
  FARMER: [
    "CULTIVATION_PLAN_VIEW",
    "CULTIVATION_PLAN_MANAGE",
    "CULTIVATION_ACTIVITY_EXECUTE",
    "CHEMICAL_APPLICATION_REQUEST",
    "HARVEST_BATCH_MANAGE",
  ],
  EXPERT: [
    "CULTIVATION_PLAN_VIEW",
    "CULTIVATION_ACTIVITY_EXECUTE",
    "CHEMICAL_APPLICATION_APPROVE",
    "EXPORT_RELEASE_REVIEW",
  ],
  ENGINEER: [
    "CULTIVATION_PLAN_VIEW",
    "CULTIVATION_ACTIVITY_EXECUTE",
    "CHEMICAL_APPLICATION_APPROVE",
    "EXPORT_RELEASE_REVIEW",
  ],
  ADMIN: [
    "CULTIVATION_PLAN_VIEW",
    "CULTIVATION_PLAN_MANAGE",
    "CULTIVATION_ACTIVITY_EXECUTE",
    "CHEMICAL_APPLICATION_REQUEST",
    "CHEMICAL_APPLICATION_APPROVE",
    "RESIDUE_STANDARD_MANAGE",
    "LAB_RESULT_MANAGE",
    "HARVEST_BATCH_MANAGE",
    "EXPORT_RELEASE_REVIEW",
    "EXPORT_RELEASE_APPROVE",
    "AUDIT_LOG_VIEW",
  ],
  GUEST: [],
};

export function hasCultivationPermission(role: AuthRole | undefined, permission: CultivationPermission) {
  if (!role) return false;
  return rolePermissions[role].includes(permission);
}

export function cultivationPermissionsFor(role: AuthRole | undefined) {
  return role ? rolePermissions[role] : [];
}
