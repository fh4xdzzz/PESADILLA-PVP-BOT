import test from "node:test";
import assert from "node:assert/strict";
import { createSettingsSync, sendHeartbeat } from "../src/sync.js";

const guild = "123456789012345678";
const baseUrl = "https://example.vercel.app";
const token = "x".repeat(40);
const quiet = { warn() {} };
const response = (status, json, headers = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  json: async () => json,
});

test("loads settings with Authorization bearer header", async () => {
  let request;
  const fakeFetch = async (url, opts) => {
    request = { url, opts };
    return response(200, { guildId: guild, settings: { welcomeEnabled: true } }, { etag: '"abc"' });
  };
  const settings = createSettingsSync({ baseUrl, token, fetchImpl: fakeFetch, logger: quiet });
  assert.equal(await settings.refresh(guild), true);
  assert.equal(settings.get(guild).welcomeEnabled, true);
  assert.equal(request.opts.headers.Authorization, "Bearer " + token);
  assert.match(request.url, /api\/bot\/guilds/);
});
test("honors 304 without discarding last-known config", async () => {
  let hit = 0;
  const fakeFetch = async () => {
    hit++;
    return hit === 1
      ? response(200, { guildId: guild, settings: { logsEnabled: true } }, { etag: '"hash"' })
      : response(304, null);
  };
  const s = createSettingsSync({ baseUrl, token, fetchImpl: fakeFetch, logger: quiet });
  await s.refresh(guild);
  await s.refresh(guild);
  assert.equal(s.get(guild).logsEnabled, true);
});
test("fails closed five minutes after last successful refresh", async () => {
  let clock = 100;
  const s = createSettingsSync({
    baseUrl, token, now: () => clock, logger: quiet,
    fetchImpl: async () => response(200, { guildId: guild, settings: { ticketsEnabled: true } }),
  });
  await s.refresh(guild);
  assert.equal(s.get(guild).ticketsEnabled, true);
  clock += 301_000;
  assert.equal(s.get(guild).ticketsEnabled, false);
});
test("failed network request does not activate a module", async () => {
  const s = createSettingsSync({
    baseUrl, token, logger: quiet,
    fetchImpl: async () => { throw new Error("network failure"); },
  });
  assert.equal(await s.refresh(guild), false);
  assert.equal(s.get(guild).autoModEnabled, false);
});
test("bot heartbeat sends only guild IDs and its identity", async () => {
  let payload;
  const ok = await sendHeartbeat({
    baseUrl, token, botUserId: "987654321012345678", guildIds: [guild],
    logger: quiet,
    fetchImpl: async (_url, opts) => {
      payload = JSON.parse(opts.body);
      assert.equal(opts.headers.Authorization, "Bearer " + token);
      return response(200, { ok: true });
    },
  });
  assert.equal(ok, true);
  assert.deepEqual(payload.guildIds, [guild]);
});
