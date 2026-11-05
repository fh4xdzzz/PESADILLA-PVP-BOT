/** Tipos del Roblox Open Cloud / APIs públicas de usuarios. */

// ---- Ban API (User Restrictions) ----
export interface GameJoinRestriction {
  active: boolean;
  startTime?: string; // RFC3339
  duration?: string;  // protobuf Duration, ej: "604800s". Ausente = permanente.
  privateReason?: string;
  displayReason?: string;
  excludeAltAccounts?: boolean;
}

export interface UserRestriction {
  path?: string;
  updateTime?: string;
  user?: string; // "users/{userId}"
  gameJoinRestriction?: GameJoinRestriction;
}

export interface ListUserRestrictionsResponse {
  userRestrictions?: UserRestriction[];
  nextPageToken?: string;
}

// ---- User profiles (users.roblox.com) ----
export interface RobloxUser {
  id: number;
  name: string;
  displayName: string;
}

export interface UsernameLookupResponse {
  data: { requestedUsername: string; hasVerifiedBadge: boolean; id: number; name: string; displayName: string }[];
}

export interface AvatarResponse {
  data: { targetId: number; state: string; imageUrl: string; expiresAt?: string }[];
}

// ---- Data Stores (Open Cloud v2) ----
export interface DataStoreEntry {
  path?: string;
  updateTime?: string;
  value?: unknown; // valor serializado
}

export interface OrderedDataStoreEntry {
  path?: string;
  value?: unknown; // "12345" score + cursor? depends
  updateTime?: string;
}

export interface ListEntriesResponse {
  dataStoreEntries?: DataStoreEntry[];
  nextPageToken?: string;
  orderedDataStoreEntries?: OrderedDataStoreEntry[];
}

// ---- Errores de API ----
export class RobloxApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
    public endpoint?: string,
  ) {
    super(message);
    this.name = 'RobloxApiError';
  }

  get isRateLimit(): boolean {
    return this.status === 429;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}
