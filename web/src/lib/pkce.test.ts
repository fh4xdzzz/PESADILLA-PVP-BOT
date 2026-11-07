import { describe, expect, it } from "vitest";
import { codeChallengeS256, generateCodeVerifier, isValidVerifier } from "./pkce";

describe("PKCE", () => {
  it("genera un verifier válido (43-128 chars, base64url)", () => {
    const v = generateCodeVerifier();
    expect(isValidVerifier(v)).toBe(true);
    expect(v).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it("produce challenges S256 distintos por verifier", () => {
    expect(codeChallengeS256(generateCodeVerifier())).not.toBe(
      codeChallengeS256(generateCodeVerifier())
    );
  });

  it("cumple el vector de prueba RFC 7636", () => {
    // Ejemplo oficial RFC 7636 appendix B
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(codeChallengeS256(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("rechaza verifiers fuera de rango", () => {
    expect(isValidVerifier("short")).toBe(false);
    expect(isValidVerifier("a".repeat(129))).toBe(false);
  });
});
