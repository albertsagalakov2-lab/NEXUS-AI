"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Image, MessageSquare, Plus, User, Video } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/chat", label: "Чаты", icon: MessageSquare },
  { href: "/image", label: "Фото", icon: Image },
  { href: "/video", label: "Видео", icon: Video },
  { href: "/profile", label: "Профиль", icon: User },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 items-center rounded-[1.5rem] border border-white/10 bg-[#070b22]/95 px-2 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl md:hidden">
      {items.slice(0, 2).map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] text-slate-400",
              active && "text-fuchsia-300"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}

      <Link
        href="/chat"
        aria-label="Новый чат"
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-blue-500 text-white shadow-[0_0_28px_rgba(139,92,246,0.5)]"
      >
        <Plus className="h-6 w-6" />
      </Link>

      {items.slice(2).map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] text-slate-400",
              active && "text-fuchsia-300"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
