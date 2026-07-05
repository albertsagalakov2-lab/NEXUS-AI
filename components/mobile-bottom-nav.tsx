"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ImageIcon, Plus, Search, SquarePen, User } from "lucide-react"
import { cn } from "@/lib/utils"

const ACTIVE_THREAD_STORAGE_KEY = "nexusai_active_chat_id"

export function MobileBottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const createNewChat = async () => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый чат" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data.chat?.id) throw new Error("Create failed")

      window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, data.chat.id)
      window.dispatchEvent(new Event("nexusai-chats-updated"))
      router.push(`/chat?id=${data.chat.id}`)
    } catch (error) {
      console.error("Create mobile chat error:", error)
      router.push("/chat")
    }
  }

  const navClass = (active: boolean) =>
    cn(
      "flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] text-slate-500 transition",
      active && "text-blue-400"
    )

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 grid h-[70px] grid-cols-5 items-center border-t border-white/[0.07] bg-[#03050a]/96 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <button type="button" onClick={createNewChat} className={navClass(pathname.startsWith("/chat"))}>
        <SquarePen className="h-5 w-5" />
        <span>Новый чат</span>
      </button>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("neiropeiro-open-search"))}
        className={navClass(false)}
      >
        <Search className="h-5 w-5" />
        <span>Поиск</span>
      </button>

      <button
        type="button"
        onClick={createNewChat}
        aria-label="Создать новый чат"
        className="mx-auto -mt-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-violet-500 via-indigo-500 to-blue-500 text-white shadow-[0_8px_30px_rgba(79,70,229,0.45)]"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Link href="/image" className={navClass(pathname.startsWith("/image"))}>
        <ImageIcon className="h-5 w-5" />
        <span>Изображения</span>
      </Link>

      <Link href="/profile" className={navClass(pathname.startsWith("/profile"))}>
        <User className="h-5 w-5" />
        <span>Профиль</span>
      </Link>
    </nav>
  )
}
