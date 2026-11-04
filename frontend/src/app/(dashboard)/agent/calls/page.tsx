"use client";

import { PageHeader, DarkCanvas } from "@/components/crm/AgentDashboardWidgets";
import { PropertyConversationsInbox } from "@/components/crm/PropertyConversationsInbox";

export default function CallsAndMessagesPage() {
  return (
    <DarkCanvas>
      <div className="space-y-6">
        <PageHeader
          title="Calls & Messages"
          subtitle="Manage conversations from your published property listings."
        />
        <PropertyConversationsInbox />
      </div>
    </DarkCanvas>
  );
}
