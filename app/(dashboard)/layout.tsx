import { AppearanceProvider } from "@/components/appearance-provider"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppearanceProvider />
      <AppSidebar />

      <main className="min-h-screen w-full pb-[70px] pt-16 lg:pb-0 lg:pl-[248px] lg:pt-0">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  )
}
