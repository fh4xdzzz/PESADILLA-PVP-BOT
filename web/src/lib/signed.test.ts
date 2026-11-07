import { beforeAll, describe, expect, it } from "vitest";
import { decodeSigned, encodeSigned, randomToken } from "./signed";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-key-for-vitest-only-0123456789";
});

describe("signed cookies", () => {
  it("hace roundtrip de datos", () => {
    const data = { state: "abc", verifier: "v".repeat(43), discordId: "123", exp: Date.now() + 1000 };
    const encoded = encodeSigned(data);
    expect(decodeSigned<typeof data>(encoded)).toEqual(data);
  });

  it("rechaza firmas manipuladas", () => {
    const encoded = encodeSigned({ a: 1 });
    const tampered = encoded.slice(0, -2) + "xx";
    expect(decodeSigned(tampered)).toBeNull();
  });

  it("rechaza payloads corruptos", () => {
    expect(decodeSigned("not-a-signed-value")).toBeNull();
    expect(decodeSigned("!!!.signature")).toBeNull();
  });

  it("genera tokens aleatorios únicos", () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(randomToken(16)).toHaveLength(22); // base64url de 16 bytes
  });
});
