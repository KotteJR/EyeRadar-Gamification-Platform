/**
 * In-memory bearer token cache for browser API calls.
 * Lives in a tiny module so auth.ts can clear it on signOut without importing api.ts
 * (avoids bundling api client into middleware / circular deps).
 */

export const BEARER_CACHE_TTL_MS = 5_000;

let cachedBearerToken = "";
let cachedAtMs = 0;

export function clearBearerTokenCache() {
  cachedBearerToken = "";
  cachedAtMs = 0;
}

export function readBearerCache(): { token: string; at: number } {
  return { token: cachedBearerToken, at: cachedAtMs };
}

export function writeBearerCache(token: string) {
  cachedBearerToken = token;
  cachedAtMs = Date.now();
}
