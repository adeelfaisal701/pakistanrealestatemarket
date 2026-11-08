export interface AgentProfileFields {
  avatarUrl?: string | null;
  agencyAddress?: string | null;
}

export function isAgentProfileComplete(
  profile: AgentProfileFields,
): boolean {
  return Boolean(profile.avatarUrl?.trim() && profile.agencyAddress?.trim());
}
