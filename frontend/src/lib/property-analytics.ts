import apiClient from "@/lib/api-client";

type PublicEventType = "view" | "call-click" | "whatsapp-click";

function getVisitorId(): string {
  const key = "prm_analytics_visitor";
  let visitorId = window.localStorage.getItem(key);
  if (!visitorId) {
    visitorId = window.crypto.randomUUID();
    window.localStorage.setItem(key, visitorId);
  }
  return visitorId;
}

export async function recordPropertyEvent(
  propertyId: string,
  event: PublicEventType,
): Promise<void> {
  await apiClient.post(`/properties/${encodeURIComponent(propertyId)}/${event}`, {
    visitorId: getVisitorId(),
  });
}
