/**
 * Property Care authentication helpers (frontend only).
 *
 * - Sessions use the EXISTING token storage and /auth endpoints unchanged.
 * - Roles always come from the backend (login response or /users/profile),
 *   never from anything the user selects.
 * - Only customer (buyer) and technician sessions are started from the
 *   Property Care sign-in page; administrators use the existing admin portal.
 */

export const PROPERTY_CARE_LOGIN_PATH = "/property-care/login";
export const PROPERTY_CARE_REGISTER_PATH = "/property-care/register";

export type PropertyCareRole = "buyer" | "technician" | "admin" | "agent" | string;

const ROLE_HOME: Record<string, string> = {
  buyer: "/care",
  technician: "/technician",
  admin: "/care-ops",
};

/** Paths each role may be returned to after signing in. */
const ROLE_RETURN_PREFIXES: Record<string, string[]> = {
  buyer: ["/care", "/maintenance"],
  technician: ["/technician"],
  admin: ["/care-ops"],
};

/** Accept only same-origin, relative Property Care paths (prevents open redirects). */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || typeof window === "undefined") return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname.startsWith("/property-care/")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Dashboard for a backend-verified role, honouring a safe returnTo for that role only. */
export function destinationForRole(role: PropertyCareRole, returnTo?: string | null): string | null {
  const home = ROLE_HOME[role];
  if (!home) return null;
  const safe = safeReturnPath(returnTo);
  if (safe && (ROLE_RETURN_PREFIXES[role] ?? []).some((prefix) => safe === prefix || safe.startsWith(`${prefix}/`) || safe.startsWith(`${prefix}?`))) {
    return safe;
  }
  return home;
}

export function loginHref(returnTo?: string) {
  return returnTo ? `${PROPERTY_CARE_LOGIN_PATH}?returnTo=${encodeURIComponent(returnTo)}` : PROPERTY_CARE_LOGIN_PATH;
}

export function hasStoredSession() {
  try {
    return Boolean(localStorage.getItem("auth_token"));
  } catch {
    return false;
  }
}

export function persistSession(accessToken: string, user: unknown) {
  localStorage.setItem("auth_token", accessToken);
  localStorage.setItem("auth_user", JSON.stringify(user));
  window.dispatchEvent(new Event("estatepro:auth-changed"));
}

export function clearSession() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
  window.dispatchEvent(new Event("estatepro:auth-changed"));
}

/** URL of the existing secure admin sign-in (admin host when configured). */
export function adminPortalHref() {
  if (typeof window === "undefined") return "/admin-login";
  const configured = process.env.NEXT_PUBLIC_ADMIN_HOSTNAME?.trim().toLowerCase();
  const host = configured || (process.env.NODE_ENV !== "production" ? "admin.localhost" : "");
  if (!host) return "/admin-login";
  const port = window.location.port ? `:${window.location.port}` : "";
  return `${window.location.protocol}//${host}${port}/login`;
}

/** Mirrors backend RegisterDto rules so users get feedback before submitting. */
export const PASSWORD_RULES = [
  { key: "length", label: "8–72 characters", test: (value: string) => value.length >= 8 && value.length <= 72 },
  { key: "letter", label: "At least one letter", test: (value: string) => /[A-Za-z]/.test(value) },
  { key: "number", label: "At least one number", test: (value: string) => /\d/.test(value) },
];

export const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;
