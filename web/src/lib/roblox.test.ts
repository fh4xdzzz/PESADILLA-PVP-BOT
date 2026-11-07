import { beforeAll, describe, expect, it } from "vitest";
import { robloxAuthorizeUrl, robloxProfileUrl, isRobloxConfigured } from "./roblox";
import type { RobloxUserInfo } from "./roblox";

beforeAll(() => {
  process.env.NEXT_PUBLIC_APP_URL = "https://example.test";
  process.env.ROBLOX_CLIENT_ID = "test-client-id";
  process.env.ROBLOX_CLIENT_SECRET = "test-client-secret";
});

describe("Roblox OAuth", () => {
  it("detecta configuración completa", () => {
    expect(isRobloxConfigured()).toBe(true);
  });

  it("construye la URL de autorización con PKCE S256 y scopes mínimos", () => {
    const url = new URL(robloxAuthorizeUrl({ state: "st8", codeChallenge: "ch4ll3ng3" }));
    expect(url.origin + url.pathname).toBe("https://apis.roblox.com/oauth/v1/authorize");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://example.test/api/auth/roblox/callback"
    );
    expect(url.searchParams.get("scope")).toBe("openid profile");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("state")).toBe("st8");
    expect(url.searchParams.get("code_challenge")).toBe("ch4ll3ng3");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("usa la URL de perfil devuelta por Roblox o la construye desde sub", () => {
    const withProfile: RobloxUserInfo = {
      sub: "1516563360",
      profile: "https://www.roblox.com/users/1516563360/profile",
    };
    expect(robloxProfileUrl(withProfile)).toBe(withProfile.profile);
    expect(robloxProfileUrl({ sub: "42" })).toBe("https://www.roblox.com/users/42/profile");
  });
});
