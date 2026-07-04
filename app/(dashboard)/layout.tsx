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

      <main className="min-h-screen w-full pb-20 transition-all duration-300 md:pb-0 md:pl-72">
        {children}
      </main>

      <MobileBottomNav />
    </div>
  )
}
