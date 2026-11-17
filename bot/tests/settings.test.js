import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSettings, DEFAULT_SETTINGS, renderWelcome } from "../src/settings.js";
import { createSpamGuard, hasLink } from "../src/moderation.js";

test("fails closed when settings JSON is bad", () => {
  assert.equal(normalizeSettings(null), null);
  assert.equal(normalizeSettings({ ...DEFAULT_SETTINGS, autoModEnabled: "true" }), null);
  assert.equal(normalizeSettings({ ...DEFAULT_SETTINGS, logsChannelId: "other-guild" }), null);
});
test("defaults remain off", () => {
  const settings = normalizeSettings({});
  assert.ok(settings);
  assert.equal(settings.autoModEnabled, false);
  assert.equal(settings.ticketsEnabled, false);
  assert.equal(settings.welcomeEnabled, false);
});
test("staff role ID is validated", () => {
  assert.equal(normalizeSettings({ ticketStaffRoleId: "anything" }), null);
  assert.equal(normalizeSettings({ ticketStaffRoleId: "123456789012345678" }).ticketStaffRoleId, "123456789012345678");
});
test("welcome replaces only supported placeholders", () => {
  const text = renderWelcome("Hola {usuario} en {servidor}", "123456789012345678", "Pesadilla");
  assert.equal(text, "Hola <@123456789012345678> en Pesadilla");
});
test("link detector catches common links", () => {
  assert.equal(hasLink("visita https://example.com"), true);
  assert.equal(hasLink("discord.gg/abc123"), true);
  assert.equal(hasLink("hola amigo"), false);
});
test("spam guard blocks sixth message in rolling 6s window", () => {
  let clock = 1_000;
  const guard = createSpamGuard({ now: () => clock });
  for (let i = 0; i < 5; i++) assert.equal(guard.exceeds("guild", "user"), false);
  assert.equal(guard.exceeds("guild", "user"), true);
  clock += 6_001;
  assert.equal(guard.exceeds("guild", "user"), false);
  guard.cleanup();
});
