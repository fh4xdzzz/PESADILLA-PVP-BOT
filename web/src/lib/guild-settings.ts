/** Settings persisted by the web dashboard. Bot runtime integration is separate. */
export interface GuildSettings {
  language: "es" | "en";
  welcomeEnabled: boolean;
  welcomeChannelId: string;
  welcomeMessage: string;
  autoModEnabled: boolean;
  antiSpamEnabled: boolean;
  antiLinksEnabled: boolean;
  ticketsEnabled: boolean;
  ticketsChannelId: string;
  ticketStaffRoleId: string;
  logsEnabled: boolean;
  logsChannelId: string;
}

export const DEFAULT_GUILD_SETTINGS: GuildSettings = {
  language: "es",
  welcomeEnabled: false,
  welcomeChannelId: "",
  welcomeMessage: "¡Bienvenido/a {usuario} a {servidor}!",
  autoModEnabled: false,
  antiSpamEnabled: true,
  antiLinksEnabled: false,
  ticketsEnabled: false,
  ticketsChannelId: "",
  ticketStaffRoleId: "",
  logsEnabled: false,
  logsChannelId: "",
};

function validChannelId(value: unknown): value is string {
  return typeof value === "string" && (value === "" || /^[0-9]{15,22}$/.test(value));
}

/** Strict allowlist: no unexpected fields, objects or unvalidated strings are persisted. */
export function validateGuildSettings(value: unknown): GuildSettings | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const booleans = ["welcomeEnabled", "autoModEnabled", "antiSpamEnabled", "antiLinksEnabled", "ticketsEnabled", "logsEnabled"] as const;
  if (!booleans.every((key) => typeof input[key] === "boolean")) return null;
  const channelKeys = ["welcomeChannelId", "ticketsChannelId", "ticketStaffRoleId", "logsChannelId"] as const;
  if (!channelKeys.every((key) => validChannelId(input[key]))) return null;
  if (input.language !== "es" && input.language !== "en") return null;
  if (typeof input.welcomeMessage !== "string" || input.welcomeMessage.length > 600) return null;
  return {
    language: input.language,
    welcomeEnabled: input.welcomeEnabled as boolean,
    welcomeChannelId: input.welcomeChannelId as string,
    welcomeMessage: input.welcomeMessage,
    autoModEnabled: input.autoModEnabled as boolean,
    antiSpamEnabled: input.antiSpamEnabled as boolean,
    antiLinksEnabled: input.antiLinksEnabled as boolean,
    ticketsEnabled: input.ticketsEnabled as boolean,
    ticketsChannelId: input.ticketsChannelId as string,
    ticketStaffRoleId: input.ticketStaffRoleId as string,
    logsEnabled: input.logsEnabled as boolean,
    logsChannelId: input.logsChannelId as string,
  };
}
