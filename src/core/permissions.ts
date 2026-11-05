import type { StaffLevel } from '../config.js';
import { config } from '../config.js';

const LEVEL_RANK: Record<StaffLevel, number> = {
  OWNER: 60,
  ADMIN: 50,
  HEAD_MOD: 40,
  MOD: 30,
  SUPPORT_STAFF: 20,
  EVENT_MANAGER: 10,
};

export function getStaffLevel(userId: string): StaffLevel | null {
  // OWNER tiene prioridad absoluta
  if (config.staff.OWNER.includes(userId)) return 'OWNER';
  if (config.staff.ADMIN.includes(userId)) return 'ADMIN';
  if (config.staff.HEAD_MOD.includes(userId)) return 'HEAD_MOD';
  if (config.staff.MOD.includes(userId)) return 'MOD';
  if (config.staff.SUPPORT_STAFF.includes(userId)) return 'SUPPORT_STAFF';
  if (config.staff.EVENT_MANAGER.includes(userId)) return 'EVENT_MANAGER';
  return null;
}

export function staffLevelAtLeast(userId: string, min: StaffLevel): boolean {
  const level = getStaffLevel(userId);
  if (!level) return false;
  return LEVEL_RANK[level] >= LEVEL_RANK[min];
}

/** Jerarquía: nadie puede actuar sobre alguien de nivel igual o superior. */
export function canModerate(actorId: string, targetStaffId: string | null): boolean {
  if (!targetStaffId) return true;
  const actor = getStaffLevel(actorId);
  const target = getStaffLevel(targetStaffId);
  if (!actor) return false;
  if (!target) return true; // el objetivo no es staff
  return LEVEL_RANK[actor] > LEVEL_RANK[target];
}

export const PERMISSIONS = {
  MODERATION_DISCORD: ['OWNER', 'ADMIN', 'HEAD_MOD', 'MOD'] as StaffLevel[],
  MODERATION_ROBLOX: ['OWNER', 'ADMIN', 'HEAD_MOD', 'MOD'] as StaffLevel[],
  PERMA_BAN_ROBLOX: ['OWNER', 'ADMIN'] as StaffLevel[],
  PROPAGATE_ALTS: ['OWNER', 'ADMIN'] as StaffLevel[],
  EDIT_STATS: ['OWNER', 'ADMIN', 'HEAD_MOD'] as StaffLevel[],
  EVENTS: ['OWNER', 'ADMIN', 'HEAD_MOD', 'EVENT_MANAGER'] as StaffLevel[],
  ANNOUNCEMENTS: ['OWNER', 'ADMIN', 'HEAD_MOD'] as StaffLevel[],
  CODES: ['OWNER', 'ADMIN', 'HEAD_MOD'] as StaffLevel[],
  TICKETS: ['OWNER', 'ADMIN', 'HEAD_MOD', 'MOD', 'SUPPORT_STAFF'] as StaffLevel[],
  CONFIG: ['OWNER', 'ADMIN'] as StaffLevel[],
  GIVEAWAYS: ['OWNER', 'ADMIN', 'HEAD_MOD', 'EVENT_MANAGER'] as StaffLevel[],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

export function hasPermission(userId: string, perm: PermissionKey): boolean {
  return PERMISSIONS[perm].some((level) => staffLevelAtLeast(userId, level));
}
