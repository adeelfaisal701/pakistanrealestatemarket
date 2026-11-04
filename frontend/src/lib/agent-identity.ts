export interface AgentIdentity {
  name: string;
  email: string | null;
  role: string;
  avatarUrl: string | null;
}

export interface AgentProfile {
  name?: unknown;
  email?: unknown;
  role?: unknown;
  avatarUrl?: unknown;
}

export const DEFAULT_AGENT_IDENTITY: AgentIdentity = {
  name: "Account",
  email: null,
  role: "agent",
  avatarUrl: null,
};

export function mapAgentIdentity(profile: unknown): AgentIdentity {
  if (!profile || typeof profile !== "object") return DEFAULT_AGENT_IDENTITY;

  const user = profile as AgentProfile;
  return {
    name: nonEmptyString(user.name) ?? DEFAULT_AGENT_IDENTITY.name,
    email: nonEmptyString(user.email),
    role: nonEmptyString(user.role) ?? DEFAULT_AGENT_IDENTITY.role,
    avatarUrl: safeAvatarUrl(user.avatarUrl),
  };
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeAvatarUrl(value: unknown): string | null {
  const candidate = nonEmptyString(value);
  if (!candidate) return null;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;

  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}
