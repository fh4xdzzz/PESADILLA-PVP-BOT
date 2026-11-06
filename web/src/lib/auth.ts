import { getSession, type SessionUser } from "./session";

/**
 * Reads the current Discord session. Uses `use cache: private` so the result
 * is cached per-session in the browser only (never on the server), which keeps
 * navigations instant under Cache Components.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  "use cache: private";
  return getSession();
}
