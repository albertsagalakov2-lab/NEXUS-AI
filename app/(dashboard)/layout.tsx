import type { CSSProperties } from "react";

import { AppearanceProvider } from "@/components/appearance-provider";
import { AppSidebar } from "@/components/app-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      id="np-dashboard-shell"
      className="min-h-screen bg-background"
      style={{ "--np-sidebar-width": "248px" } as CSSProperties}
    >
      <AppearanceProvider />
      <AppSidebar />

      <main className="min-h-screen w-full pt-16 transition-[padding] duration-300 lg:pl-[var(--np-sidebar-width)] lg:pt-0">
        {children}
      </main>
    </div>
  );
}
