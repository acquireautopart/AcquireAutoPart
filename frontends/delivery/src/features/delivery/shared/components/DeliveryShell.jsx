"use client";

import DeliverySidebar from "@/features/delivery/shared/components/DeliverySidebar";

export default function DeliveryShell({
  agent,
  activeSection,
  onSelectSection,
  onLogout,
  children,
}) {
  return (
    <div className="min-h-screen bg-[#f4f5f6] text-[#17212b]">
      <DeliverySidebar
        agent={agent}
        activeSection={activeSection}
        onSelectSection={onSelectSection}
        onLogout={onLogout}
      />
      <div className="min-h-screen md:pl-60">{children}</div>
    </div>
  );
}
