/**
 * Validación de datos que recibe el bot: nunca activar módulos con un JSON inválido.
 * Valores seguros = todo apagado hasta recibir una configuración verificada.
 */
export const DEFAULT_SETTINGS = Object.freeze({
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
});

const snowflake = (x) => typeof x === "string" && (x === "" || /^\d{15,22}$/.test(x));

export function normalizeSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = { ...DEFAULT_SETTINGS, ...raw };
  for (const key of [
    "welcomeEnabled", "autoModEnabled", "antiSpamEnabled", "antiLinksEnabled", "ticketsEnabled", "logsEnabled",
  ]) {
    if (typeof v[key] !== "boolean") return null;
  }
  for (const key of ["welcomeChannelId", "ticketsChannelId", "ticketStaffRoleId", "logsChannelId"]) {
    if (!snowflake(v[key])) return null;
  }
  if (v.language !== "es" && v.language !== "en") return null;
  if (typeof v.welcomeMessage !== "string" || v.welcomeMessage.length > 600) return null;
  return Object.freeze({
    language: v.language, welcomeEnabled: v.welcomeEnabled,
    welcomeChannelId: v.welcomeChannelId, welcomeMessage: v.welcomeMessage,
    autoModEnabled: v.autoModEnabled, antiSpamEnabled: v.antiSpamEnabled,
    antiLinksEnabled: v.antiLinksEnabled, ticketsEnabled: v.ticketsEnabled,
    ticketsChannelId: v.ticketsChannelId, ticketStaffRoleId: v.ticketStaffRoleId,
    logsEnabled: v.logsEnabled, logsChannelId: v.logsChannelId,
  });
}

export function renderWelcome(template, memberId, guildName) {
  return template.replaceAll("{usuario}", "<@" + memberId + ">")
    .replaceAll("{servidor}", guildName).slice(0, 1800);
}
