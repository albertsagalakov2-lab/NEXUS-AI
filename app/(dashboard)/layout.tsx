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
      className="h-[100dvh] min-h-0 overflow-hidden bg-black lg:h-auto lg:min-h-screen lg:overflow-visible"
      style={{ "--np-sidebar-width": "248px" } as CSSProperties}
    >
      <AppearanceProvider />
      <AppSidebar />

      <main className="h-[100dvh] min-h-0 w-full overflow-hidden bg-black pt-16 transition-[padding] duration-300 lg:h-auto lg:min-h-screen lg:overflow-visible lg:pl-[var(--np-sidebar-width)] lg:pt-0">
        {children}
      </main>
    </div>
  );
}
