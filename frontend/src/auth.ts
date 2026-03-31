/**
 * NextAuth v5 — Keycloak OIDC configuration.
 *
 * Two sign-in methods:
 *   1. credentials  — username/password form → Keycloak ROPC token endpoint
 *                     (requires "Direct Access Grants" enabled on the Keycloak client)
 *   2. keycloak     — standard OIDC redirect flow (fallback / SSO)
 *
 * Required env vars:
 *   AUTH_KEYCLOAK_ID       e.g. "eyeradar-frontend"
 *   AUTH_KEYCLOAK_SECRET   client secret from Keycloak
 *   AUTH_KEYCLOAK_ISSUER   e.g. "http://localhost:8080/realms/game_dev"
 *   AUTH_SECRET            openssl rand -hex 32
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Keycloak from "next-auth/providers/keycloak";
import { clearBearerTokenCache } from "@/lib/bearer-cache";

const REFRESH_SKEW_SECONDS = 30;
const refreshInFlight = new Map<string, Promise<Record<string, unknown>>>();

async function refreshAccessToken(token: Record<string, unknown>) {
  const issuer =
    process.env.AUTH_KEYCLOAK_ISSUER ?? process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
  const clientId =
    process.env.AUTH_KEYCLOAK_ID ?? process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;
  const refreshToken = token.refreshToken as string | undefined;

  if (!issuer || !clientId || !clientSecret) {
    return { ...token, error: "RefreshAccessTokenError" };
  }
  // Some realms/clients do not issue refresh tokens for certain flows.
  // Keep current access token until actual expiry in that case.
  if (!refreshToken) {
    return token;
  }

  // Prevent parallel refresh calls from invalidating rotating refresh tokens.
  // When many requests arrive at once, only one refresh should hit Keycloak.
  const existingRefresh = refreshInFlight.get(refreshToken);
  if (existingRefresh) {
    const shared = await existingRefresh;
    return { ...token, ...shared };
  }

  const refreshPromise = (async () => {
    try {
      const tokenUrl = `${issuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        }).toString(),
      });

      const refreshed = await res.json();
      if (!res.ok || refreshed?.error) {
        return { ...token, error: "RefreshAccessTokenError" };
      }

      return {
        ...token,
        accessToken: refreshed.access_token ?? token.accessToken,
        idToken: refreshed.id_token ?? token.idToken,
        refreshToken: refreshed.refresh_token ?? refreshToken,
        expiresAt: Math.floor(Date.now() / 1000) + (Number(refreshed.expires_in) || 300),
        error: undefined,
      };
    } catch {
      return { ...token, error: "RefreshAccessTokenError" };
    }
  })();

  refreshInFlight.set(refreshToken, refreshPromise);

  try {
    const result = await refreshPromise;
    return { ...token, ...result };
  } finally {
    refreshInFlight.delete(refreshToken);
  }
}

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    idToken?: string;
    roles?: string[];
    error?: string;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  /**
   * Production behind Railway / reverse proxy: required so callback URLs and cookies resolve.
   * Also set AUTH_TRUST_HOST=true in env (Auth.js reads it; explicit here for clarity).
   */
  trustHost: true,
  /**
   * Long-lived app session cookie; access tokens still expire per Keycloak but refresh
   * runs in jwt callback. Short NextAuth maxAge is a common cause of "logged out every few minutes"
   * while Keycloak SSO is still valid — see Auth.js session vs token lifetime notes.
   */
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 60,
  },
  events: {
    async signOut() {
      clearBearerTokenCache();
    },
  },
  // Prefer AUTH_* vars, but allow NEXT_PUBLIC_* fallbacks to reduce setup friction.
  // This keeps server-side auth config aligned with client-side issuer/client-id usage.
  providers: [
    // ── 1. Username/password form (ROPC) ──────────────────────────────────────
    Credentials({
      id: "credentials",
      name: "Username & Password",
      credentials: {
        username: { label: "Username or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async authorize(credentials: any) {
        const issuer =
          process.env.AUTH_KEYCLOAK_ISSUER ?? process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
        const clientId =
          process.env.AUTH_KEYCLOAK_ID ?? process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
        const clientSecret = process.env.AUTH_KEYCLOAK_SECRET;

        const { username, password } = credentials as {
          username: string;
          password: string;
        };
        const normalizedUsername = username?.trim();
        if (!issuer || !clientId || !clientSecret || !normalizedUsername || !password) return null;

        const tokenUrl = `${issuer.replace(/\/$/, "")}/protocol/openid-connect/token`;
        try {
          const res = await fetch(tokenUrl, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              grant_type: "password",
              client_id: clientId,
              client_secret: clientSecret,
              username: normalizedUsername,
              password,
              scope: "openid email profile offline_access",
            }).toString(),
          });

          const tokenResponse = await res
            .json()
            .catch(() => ({ error: "unknown_error", error_description: "Invalid JSON response" }));
          if (!res.ok || tokenResponse?.error) {
            console.error("[auth][credentials] Keycloak token request failed", {
              status: res.status,
              statusText: res.statusText,
              issuer,
              clientId,
              username: normalizedUsername,
              error: tokenResponse?.error,
              error_description: tokenResponse?.error_description,
            });
            return null;
          }
          const tokens = tokenResponse;

          // Decode the access token to extract claims
          const payloadB64 = tokens.access_token.split(".")[1];
          const payload = JSON.parse(
            Buffer.from(payloadB64, "base64url").toString()
          );

          return {
            id: payload.sub as string,
            name: (payload.name || payload.preferred_username) as string,
            email: (payload.email || payload.preferred_username) as string,
            // Store tokens on the user object so jwt callback can pick them up
            accessToken: tokens.access_token as string,
            idToken: tokens.id_token as string | undefined,
            refreshToken: tokens.refresh_token as string | undefined,
            expiresAt: Math.floor(Date.now() / 1000) + (Number(tokens.expires_in) || 300),
            roles: (payload.realm_access?.roles as string[]) ?? [],
          };
        } catch (error) {
          console.error("[auth][credentials] Unexpected authorize() failure", {
            issuer,
            clientId,
            username: normalizedUsername,
            error,
          });
          return null;
        }
      },
    }),

    // ── 2. Standard Keycloak OIDC redirect (SSO) ─────────────────────────────
    Keycloak({
      clientId:
        process.env.AUTH_KEYCLOAK_ID ?? process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.AUTH_KEYCLOAK_SECRET!,
      issuer:
        process.env.AUTH_KEYCLOAK_ISSUER ?? process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER!,
      authorization: {
        params: {
          scope: "openid email profile offline_access",
        },
      },
    }),
  ],

  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user, account, profile }: any) {
      // Credentials flow: tokens come on the user object from authorize()
      if (user) {
        if (user.accessToken) token.accessToken = user.accessToken;
        if (user.idToken) token.idToken = user.idToken;
        if (user.refreshToken) token.refreshToken = user.refreshToken;
        if (user.expiresAt) token.expiresAt = user.expiresAt;
        if (user.roles) token.roles = user.roles;
        if (user.id) token.sub = user.id;
      }
      // OAuth flow: tokens come on account, roles from OIDC profile
      if (account) {
        if (account.access_token) token.accessToken = account.access_token as string;
        if (account.id_token) token.idToken = account.id_token as string;
        if (account.refresh_token) token.refreshToken = account.refresh_token as string;
        token.expiresAt = account.expires_at as number | undefined;
      }
      if (profile) {
        const p = profile as Record<string, unknown>;
        const realmAccess = p.realm_access as { roles?: string[] } | undefined;
        token.roles = realmAccess?.roles ?? [];
        token.sub = p.sub as string | undefined;
      }

      // Refresh shortly before expiry to avoid refresh loops on short token lifetimes.
      const expiresAt = Number(token.expiresAt || 0);
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt && now >= expiresAt - REFRESH_SKEW_SECONDS) {
        const refreshed = await refreshAccessToken(token);
        // If refresh failed but token is still valid for a bit, keep playing.
        if (
          refreshed?.error === "RefreshAccessTokenError" &&
          now < expiresAt
        ) {
          return { ...token, error: undefined };
        }
        return refreshed;
      }
      return token;
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      session.accessToken = token.accessToken as string | undefined;
      session.idToken = token.idToken as string | undefined;
      session.roles = (token.roles as string[] | undefined) ?? [];
      session.error = token.error as string | undefined;
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
});
