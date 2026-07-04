"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import {
  MessageSquare,
  Image,
  Video,
  CreditCard,
  User,
  Sparkles,
  Menu,
  X,
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  LogOut,
  Trash2,
  Pencil,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { BrandMark } from "@/components/brand-mark"

const navigation = [
  { name: "Чаты", href: "/chat", icon: MessageSquare },
  { name: "Генерация фото", href: "/image", icon: Image },
  { name: "Генерация видео", href: "/video", icon: Video },
  { name: "Тарифы", href: "/pricing", icon: CreditCard },
  { name: "Профиль", href: "/profile", icon: User },
]

const ACTIVE_THREAD_STORAGE_KEY = "nexusai_active_chat_id"
const RECENT_COLLAPSED_KEY = "nexusai_recent_collapsed"

const LEGACY_THREADS_STORAGE_KEY = "nexusai_chat_threads"
const LEGACY_CHAT_STORAGE_KEY = "nexusai_chat_history"

type ChatThread = {
  id: string
  title: string
  user_id: string
  created_at: string
  updated_at: string
}

type ProfileRow = {
  full_name: string | null
  email: string | null
  plan: string | null
}

function formatThreadDate(value: string) {
  const date = new Date(value)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return "Сегодня"
  }

  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays <= 7) {
    return "Предыдущие 7 дней"
  }

  return "Ранее"
}

function getPlanLabel(plan?: string | null) {
  if (!plan || plan === "free") return "Бесплатный тариф"
  return plan
}

async function fetchChats() {
  const response = await fetch("/api/chats", {
    cache: "no-store",
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || "Не получилось загрузить чаты")
  }

  return (data.chats || []) as ChatThread[]
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const isChatPage = pathname.startsWith("/chat")

  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [recentCollapsed, setRecentCollapsed] = useState(false)

  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")
  const [userPlan, setUserPlan] = useState("free")

  const [editingThreadId, setEditingThreadId] = useState("")
  const [editingTitle, setEditingTitle] = useState("")

  const [deleteConfirmThread, setDeleteConfirmThread] =
    useState<ChatThread | null>(null)
  const [isDeletingThread, setIsDeletingThread] = useState(false)

  const displayUser = userName.trim() || userEmail || "Пользователь"

  const loadChats = async () => {
    try {
      const chats = await fetchChats()
      setThreads(chats)

      const activeId =
        window.localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY) || ""

      setActiveThreadId(activeId)
    } catch (error) {
      console.error("Load chats error:", error)
    }
  }

  const loadProfile = async () => {
    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      setUserEmail(user.email || "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,email,plan")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>()

      setUserName(profile?.full_name || "")
      setUserEmail(profile?.email || user.email || "")
      setUserPlan(profile?.plan || "free")
    } catch (error) {
      console.error("Load profile error:", error)
    }
  }

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_THREADS_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY)

    const savedRecent = window.localStorage.getItem(RECENT_COLLAPSED_KEY)
    setRecentCollapsed(savedRecent === "true")

    loadProfile()
    loadChats()

    const refresh = () => {
      loadProfile()
      loadChats()
    }

    window.addEventListener("storage", refresh)
    window.addEventListener("focus", refresh)
    window.addEventListener("nexusai-chats-updated", refresh)

    const interval = window.setInterval(refresh, 3000)

    return () => {
      window.removeEventListener("storage", refresh)
      window.removeEventListener("focus", refresh)
      window.removeEventListener("nexusai-chats-updated", refresh)
      window.clearInterval(interval)
    }
  }, [])

  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    if (!query) return threads

    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(query)
    )
  }, [threads, searchQuery])

  const groupedThreads = useMemo(() => {
    return filteredThreads.reduce<Record<string, ChatThread[]>>(
      (groups, thread) => {
        const label = formatThreadDate(thread.updated_at)
        groups[label] = groups[label] || []
        groups[label].push(thread)
        return groups
      },
      {}
    )
  }, [filteredThreads])

  const toggleRecent = () => {
    const nextValue = !recentCollapsed
    setRecentCollapsed(nextValue)
    window.localStorage.setItem(RECENT_COLLAPSED_KEY, String(nextValue))
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Новый чат",
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error("Create chat failed:", data)
        alert(data.error || "Не получилось создать новый чат")
        return
      }

      const chat = data.chat as ChatThread

      if (!chat?.id) {
        alert("Чат создался неправильно: нет id")
        return
      }

      setActiveThreadId(chat.id)
      window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, chat.id)

      setMobileOpen(false)
      setSearchOpen(false)

      await loadChats()

      window.dispatchEvent(new Event("nexusai-chats-updated"))

      router.push(`/chat?id=${chat.id}`)
    } catch (error) {
      console.error("Create chat error:", error)
      alert("Ошибка при создании нового чата")
    }
  }

  const openThread = (threadId: string) => {
    setActiveThreadId(threadId)
    window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, threadId)

    setMobileOpen(false)
    setSearchOpen(false)

    router.push(`/chat?id=${threadId}`)
  }

  const startRenameThread = (thread: ChatThread) => {
    setEditingThreadId(thread.id)
    setEditingTitle(thread.title)
  }

  const cancelRenameThread = () => {
    setEditingThreadId("")
    setEditingTitle("")
  }

  const saveRenameThread = async (threadId: string) => {
    const title = editingTitle.trim() || "Новый чат"

    try {
      const response = await fetch(`/api/chats/${threadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error("Rename chat failed:", data)
        alert(data.error || "Не получилось переименовать чат")
        return
      }

      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId ? { ...thread, title } : thread
        )
      )

      setEditingThreadId("")
      setEditingTitle("")

      window.dispatchEvent(new Event("nexusai-chats-updated"))
    } catch (error) {
      console.error("Rename chat error:", error)
      alert("Ошибка при переименовании чата")
    }
  }

  const deleteThread = (threadId: string) => {
    const thread = threads.find((item) => item.id === threadId)

    if (!thread) return

    setDeleteConfirmThread(thread)
  }

  const confirmDeleteThread = async () => {
    if (!deleteConfirmThread || isDeletingThread) return

    const threadId = deleteConfirmThread.id

    setIsDeletingThread(true)

    try {
      const response = await fetch(`/api/chats/${threadId}`, {
        method: "DELETE",
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        console.error("Delete chat failed:", data)
        alert(data.error || "Не получилось удалить чат")
        return
      }

      const nextThreads = threads.filter((thread) => thread.id !== threadId)
      setThreads(nextThreads)

      if (threadId === activeThreadId) {
        const nextThread = nextThreads[0]

        if (nextThread) {
          setActiveThreadId(nextThread.id)
          window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, nextThread.id)
          router.push(`/chat?id=${nextThread.id}`)
        } else {
          window.localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY)
          await handleNewChat()
        }
      }

      setDeleteConfirmThread(null)
      window.dispatchEvent(new Event("nexusai-chats-updated"))
    } catch (error) {
      console.error("Delete chat error:", error)
      alert("Ошибка при удалении чата")
    } finally {
      setIsDeletingThread(false)
    }
  }

  const openSearch = () => {
    setSearchQuery("")
    setSearchOpen(true)
  }

  const handleSignOut = async () => {
    const supabase = createClient()

    await supabase.auth.signOut()

    window.localStorage.removeItem(ACTIVE_THREAD_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_THREADS_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_CHAT_STORAGE_KEY)

    window.location.href = "/sign-in"
  }

  const renderThreadRow = (thread: ChatThread, compact = false) => {
    const isActiveThread = isChatPage && thread.id === activeThreadId
    const isEditing = editingThreadId === thread.id

    if (isEditing) {
      return (
        <div
          key={thread.id}
          className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-2",
            isActiveThread
              ? "bg-primary text-primary-foreground"
              : "bg-secondary"
          )}
        >
          <input
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                saveRenameThread(thread.id)
              }

              if (e.key === "Escape") {
                cancelRenameThread()
              }
            }}
            autoFocus
            className="min-w-0 flex-1 rounded-md bg-background px-2 py-1 text-sm text-foreground outline-none"
          />

          <button
            type="button"
            onClick={() => saveRenameThread(thread.id)}
            className="rounded-md p-1 hover:bg-background/20"
            title="Сохранить"
          >
            <Check className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={cancelRenameThread}
            className="rounded-md p-1 hover:bg-background/20"
            title="Отмена"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )
    }

    return (
      <div
        key={thread.id}
        className={cn(
          "group flex items-center gap-1 rounded-lg transition-colors",
          isActiveThread
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        )}
      >
        <button
          type="button"
          onClick={() => openThread(thread.id)}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium",
            compact && "py-3"
          )}
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          <span className="truncate">{thread.title}</span>
        </button>

        <button
          type="button"
          onClick={() => startRenameThread(thread)}
          className={cn(
            "rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100",
            isActiveThread
              ? "hover:bg-primary-foreground/20"
              : "hover:bg-background"
          )}
          title="Переименовать"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={() => deleteThread(thread.id)}
          className={cn(
            "mr-1 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100",
            isActiveThread
              ? "hover:bg-primary-foreground/20"
              : "hover:bg-destructive/10 hover:text-destructive"
          )}
          title="Удалить"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 border border-white/10 bg-[#090e2a]/85 text-white shadow-lg backdrop-blur md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {deleteConfirmThread && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>

              <div>
                <h2 className="text-lg font-semibold">Удалить чат?</h2>
                <p className="text-sm text-muted-foreground">
                  Это действие нельзя будет отменить.
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-border bg-secondary/50 p-3">
              <p className="truncate text-sm font-medium">
                {deleteConfirmThread.title}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteConfirmThread(null)}
                disabled={isDeletingThread}
              >
                Отмена
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteThread}
                disabled={isDeletingThread}
              >
                {isDeletingThread ? "Удаляем..." : "Удалить"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-5 w-5 text-muted-foreground" />

              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск в чатах..."
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />

              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-border p-3">
              <Button
                type="button"
                onClick={handleNewChat}
                className="w-full justify-start"
                variant="secondary"
              >
                <Plus className="mr-2 h-4 w-4" />
                Новый чат
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {filteredThreads.length > 0 ? (
                <div className="space-y-5">
                  {Object.entries(groupedThreads).map(
                    ([group, groupThreads]) => (
                      <div key={group}>
                        <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                          {group}
                        </div>

                        <div className="space-y-1">
                          {groupThreads.map((thread) =>
                            renderThreadRow(thread, true)
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center text-center">
                  <Search className="mb-3 h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm font-medium">Ничего не найдено</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Попробуйте другой запрос
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-[#060a20]/95 shadow-[18px_0_55px_rgba(0,0,0,0.22)] backdrop-blur-xl transition-transform duration-300 md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-[76px] items-center border-b border-white/10 px-5">
          <BrandMark />
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-3 border-b border-white/10 p-4">
            <Button
              type="button"
              onClick={handleNewChat}
              className="h-11 w-full justify-start border-0 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 text-white shadow-[0_10px_30px_rgba(139,92,246,0.28)] hover:brightness-110"
              variant="default"
            >
              <Plus className="mr-2 h-4 w-4" />
              Новый чат
            </Button>

            <Button
              type="button"
              onClick={openSearch}
              className={cn(
                "h-10 w-full justify-start border border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07] hover:text-white",
                searchOpen && "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200"
              )}
              variant="ghost"
            >
              <Search className="mr-2 h-4 w-4" />
              Искать чаты
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === item.href
                    : pathname.startsWith(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border border-fuchsia-400/25 bg-gradient-to-r from-fuchsia-500/15 to-blue-500/10 text-white shadow-[inset_0_0_24px_rgba(139,92,246,0.08)]"
                        : "border border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-6">
              <button
                type="button"
                onClick={toggleRecent}
                className="mb-2 flex w-full items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <span>Недавние чаты</span>
                {recentCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {!recentCollapsed && (
                <div className="space-y-1">
                  {threads.length > 0 ? (
                    threads
                      .slice(0, 20)
                      .map((thread) => renderThreadRow(thread))
                  ) : (
                    <div className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
                      Пока нет сохранённых чатов
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-border p-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500">
                <User className="h-4 w-4 text-white" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayUser}</p>
                <p className="text-xs text-muted-foreground">
                  {getPlanLabel(userPlan)}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full justify-start text-muted-foreground hover:text-foreground"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
