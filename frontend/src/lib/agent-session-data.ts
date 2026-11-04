export const LEGACY_AGENT_DASHBOARD_STORAGE_KEY =
  "estatepro-agent-dashboard-v1";

type StorageLike = { removeItem: (key: string) => void };

export function getAgentAccountId(serializedUser: string | null): string | null {
  if (!serializedUser) return null;

  try {
    const user: unknown = JSON.parse(serializedUser);
    if (
      user &&
      typeof user === "object" &&
      "id" in user &&
      typeof user.id === "string" &&
      user.id.trim()
    ) {
      return user.id;
    }
  } catch {
    return null;
  }

  return null;
}

export function clearAgentDashboardData(
  storage: StorageLike,
  resetStore: () => void,
): void {
  storage.removeItem(LEGACY_AGENT_DASHBOARD_STORAGE_KEY);
  resetStore();
}

export function synchronizeAgentDashboardAccount(
  storage: StorageLike,
  previousAccountId: string | null,
  nextAccountId: string | null,
  resetStore: () => void,
): string | null {
  storage.removeItem(LEGACY_AGENT_DASHBOARD_STORAGE_KEY);
  if (previousAccountId !== nextAccountId) resetStore();
  return nextAccountId;
}
