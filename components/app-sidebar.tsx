"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  Crown,
  Headphones,
  ImageIcon,
  LogOut,
  Menu,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Sparkles,
  SquarePen,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const ACTIVE_THREAD_STORAGE_KEY = "nexusai_active_chat_id";
const RECENT_COLLAPSED_KEY = "nexusai_recent_collapsed";
const DESKTOP_COLLAPSED_KEY = "neiropeiro_desktop_sidebar_collapsed";

type ChatThread = {
  id: string;
  title: string;
  user_id: string;
  created_at: string;
  updated_at: string;
};

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  plan: string | null;
};

type MenuItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  soon?: boolean;
};

const workspaceItems: MenuItem[] = [
  { label: "AI-агент", icon: Bot, soon: true },
];

const creationItems: MenuItem[] = [
  { label: "Изображения", icon: ImageIcon, href: "/image" },
  { label: "Видео", icon: Video, href: "/video" },
  { label: "Аудио", icon: Headphones, soon: true },
  { label: "Музыка", icon: Music2, soon: true },
];

function getPlanLabel(plan?: string | null) {
  if (!plan || plan.toLowerCase() === "free") return "Бесплатный план";
  return plan;
}

async function fetchChats() {
  const response = await fetch("/api/chats", { cache: "no-store" });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Не получилось загрузить чаты");
  }

  return (data.chats || []) as ChatThread[];
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState("");
  const [recentCollapsed, setRecentCollapsed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [userPlan, setUserPlan] = useState("free");
  const [editingThreadId, setEditingThreadId] = useState("");
  const [editingTitle, setEditingTitle] = useState("");

  const displayUser = userName.trim() || userEmail || "Пользователь";

  const loadChats = useCallback(async () => {
    try {
      const chats = await fetchChats();
      setThreads(chats);
      setActiveThreadId(
        window.localStorage.getItem(ACTIVE_THREAD_STORAGE_KEY) || "",
      );
    } catch (error) {
      console.error("Load chats error:", error);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setUserEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name,email,plan")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      setUserName(profile?.full_name || "");
      setUserEmail(profile?.email || user.email || "");
      setUserPlan(profile?.plan || "free");
    } catch (error) {
      console.error("Load profile error:", error);
    }
  }, []);

  useEffect(() => {
    setRecentCollapsed(
      window.localStorage.getItem(RECENT_COLLAPSED_KEY) === "true",
    );
    setDesktopCollapsed(
      window.localStorage.getItem(DESKTOP_COLLAPSED_KEY) === "true",
    );

    loadProfile();
    loadChats();

    const refresh = () => {
      loadProfile();
      loadChats();
    };

    const openMobileMenu = () => setMobileOpen(true);
    const openSearch = () => {
      setMobileOpen(true);
      setSearchOpen(true);
      window.setTimeout(() => {
        document.getElementById("sidebar-chat-search")?.focus();
      }, 120);
    };

    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("nexusai-chats-updated", refresh);
    window.addEventListener("neiropeiro-open-mobile-menu", openMobileMenu);
    window.addEventListener("neiropeiro-open-search", openSearch);

    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("nexusai-chats-updated", refresh);
      window.removeEventListener("neiropeiro-open-mobile-menu", openMobileMenu);
      window.removeEventListener("neiropeiro-open-search", openSearch);
    };
  }, [loadChats, loadProfile]);

  useEffect(() => {
    const shell = document.getElementById("np-dashboard-shell");
    const width = desktopCollapsed ? "72px" : "248px";

    shell?.style.setProperty("--np-sidebar-width", width);
    window.localStorage.setItem(
      DESKTOP_COLLAPSED_KEY,
      String(desktopCollapsed),
    );

    return () => {
      shell?.style.setProperty("--np-sidebar-width", "248px");
    };
  }, [desktopCollapsed]);

  const toggleDesktopSidebar = () => {
    setDesktopCollapsed((value) => !value);
  };

  const filteredThreads = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return threads;
    return threads.filter((thread) =>
      thread.title.toLowerCase().includes(query),
    );
  }, [searchQuery, threads]);

  const createNewChat = async () => {
    try {
      const response = await fetch("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый чат" }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.chat?.id) {
        throw new Error(data.error || "Не получилось создать чат");
      }

      const chat = data.chat as ChatThread;
      window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, chat.id);
      setActiveThreadId(chat.id);
      setMobileOpen(false);
      setSearchOpen(false);
      window.dispatchEvent(new Event("nexusai-chats-updated"));
      router.push(`/chat?id=${chat.id}`);
    } catch (error) {
      console.error("Create chat error:", error);
      alert("Не получилось создать новый чат");
    }
  };

  const openThread = (threadId: string) => {
    window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, threadId);
    setActiveThreadId(threadId);
    setMobileOpen(false);
    setSearchOpen(false);
    router.push(`/chat?id=${threadId}`);
  };

  const saveRename = async (threadId: string) => {
    const title = editingTitle.trim() || "Новый чат";

    try {
      const response = await fetch(`/api/chats/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) throw new Error("Rename failed");

      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId ? { ...thread, title } : thread,
        ),
      );
      setEditingThreadId("");
      setEditingTitle("");
      window.dispatchEvent(new Event("nexusai-chats-updated"));
    } catch (error) {
      console.error("Rename chat error:", error);
    }
  };

  const deleteThread = async (threadId: string) => {
    if (!window.confirm("Удалить этот чат?")) return;

    try {
      const response = await fetch(`/api/chats/${threadId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Delete failed");

      const nextThreads = threads.filter((thread) => thread.id !== threadId);
      setThreads(nextThreads);

      if (threadId === activeThreadId) {
        if (nextThreads[0]) {
          openThread(nextThreads[0].id);
        } else {
          await createNewChat();
        }
      }
    } catch (error) {
      console.error("Delete chat error:", error);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const toggleRecent = () => {
    const next = !recentCollapsed;
    setRecentCollapsed(next);
    window.localStorage.setItem(RECENT_COLLAPSED_KEY, String(next));
  };

  const renderMenuItem = (
    item: MenuItem,
    closeMobile = false,
    compact = false,
  ) => {
    const Icon = item.icon;
    const active = item.href ? pathname.startsWith(item.href) : false;

    if (item.href) {
      return (
        <Link
          key={item.label}
          href={item.href}
          onClick={() => closeMobile && setMobileOpen(false)}
          title={compact ? item.label : undefined}
          aria-label={compact ? item.label : undefined}
          className={cn(
            "np-sidebar-item",
            compact && "justify-center px-0",
            active && "np-sidebar-item-active",
          )}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          {!compact && <span>{item.label}</span>}
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        type="button"
        className={cn(
          "np-sidebar-item group",
          compact && "justify-center px-0",
        )}
        title={compact ? `${item.label} — скоро` : "Скоро"}
        aria-label={compact ? item.label : undefined}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!compact && (
          <>
            <span>{item.label}</span>
            {item.soon && (
              <span className="np-sidebar-soon transition group-hover:text-violet-300">
                скоро
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const renderThread = (thread: ChatThread) => {
    const active = thread.id === activeThreadId;

    return (
      <div
        key={thread.id}
        className={cn(
          "group flex min-h-9 items-center rounded-lg px-2 transition",
          active ? "bg-white/[0.065]" : "hover:bg-white/[0.035]",
        )}
      >
        {editingThreadId === thread.id ? (
          <>
            <input
              autoFocus
              value={editingTitle}
              onChange={(event) => setEditingTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveRename(thread.id);
                if (event.key === "Escape") setEditingThreadId("");
              }}
              className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white outline-none"
            />
            <button
              type="button"
              onClick={() => saveRename(thread.id)}
              className="rounded p-1 text-emerald-300 hover:bg-white/5"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => openThread(thread.id)}
              className="min-w-0 flex-1 truncate px-1 py-2 text-left text-xs text-slate-400 transition hover:text-white"
              title={thread.title}
            >
              {thread.title}
            </button>
            <div className="flex shrink-0 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => {
                  setEditingThreadId(thread.id);
                  setEditingTitle(thread.title);
                }}
                className="rounded p-1 text-slate-600 hover:bg-white/5 hover:text-white"
                title="Переименовать"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => deleteThread(thread.id)}
                className="rounded p-1 text-slate-600 hover:bg-rose-500/10 hover:text-rose-300"
                title="Удалить"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  const sidebarContents = (mobile = false, compact = false) => (
    <>
      {mobile ? (
        <div className="flex h-[72px] items-center gap-3 border-b border-white/[0.055] px-4">
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-sm font-semibold text-white"
            aria-label="Профиль"
          >
            {displayUser.slice(0, 1).toUpperCase()}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {displayUser}
            </p>
            <p className="np-sidebar-plan truncate">{getPlanLabel(userPlan)}</p>
          </div>
          <button
            type="button"
            onClick={createNewChat}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Новый чат"
          >
            <SquarePen className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Закрыть меню"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex h-[70px] items-center border-b border-white/[0.055]",
            compact ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          <BrandMark
            compact={compact}
            className={cn(
              "[&>div]:h-9 [&>div]:w-9 [&>span]:text-[17px]",
              compact && "gap-0",
            )}
          />
          <button
            type="button"
            onClick={toggleDesktopSidebar}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/5 hover:text-white",
              compact &&
                "absolute left-[56px] top-[19px] z-10 border border-white/[0.08] bg-[#080b13] shadow-lg",
            )}
            title={compact ? "Показать меню" : "Скрыть меню"}
            aria-label={compact ? "Показать меню" : "Скрыть меню"}
          >
            {compact ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto py-3",
          compact ? "px-2" : "px-3",
        )}
      >
        {mobile && (
          <Link
            href="/pricing"
            onClick={() => setMobileOpen(false)}
            className="mb-3 block rounded-2xl border border-violet-400/25 bg-gradient-to-r from-violet-500/20 to-blue-500/20 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Crown className="h-4 w-4 text-violet-300" />
              Попробуйте NeiroPeiro Ultra
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Больше генераций и возможностей
            </p>
            <span className="mt-3 flex h-8 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 text-xs font-medium text-white">
              Улучшить план
            </span>
          </Link>
        )}

        <button
          type="button"
          onClick={createNewChat}
          title={compact ? "Новый чат" : undefined}
          aria-label={compact ? "Новый чат" : undefined}
          className={cn(
            "np-sidebar-item np-sidebar-new-chat",
            compact && "justify-center px-0",
          )}
        >
          <SquarePen className="h-[18px] w-[18px] shrink-0" />
          {!compact && <span>Новый чат</span>}
        </button>

        <button
          type="button"
          onClick={() => {
            if (compact) {
              setDesktopCollapsed(false);
              window.setTimeout(() => setSearchOpen(true), 180);
              return;
            }
            setSearchOpen((value) => !value);
          }}
          title={compact ? "Поиск" : undefined}
          aria-label={compact ? "Поиск" : undefined}
          className={cn(
            "np-sidebar-item",
            compact && "justify-center px-0",
            searchOpen && "np-sidebar-item-active",
          )}
        >
          <Search className="h-[18px] w-[18px] shrink-0" />
          {!compact && <span>Поиск</span>}
        </button>

        {searchOpen && !compact && (
          <div className="mb-2 px-1 pt-1">
            <div className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] bg-black/25 px-3">
              <Search className="h-3.5 w-3.5 text-slate-600" />
              <input
                id="sidebar-chat-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Найти чат"
                className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-600"
              />
            </div>
          </div>
        )}

        <div className="space-y-0.5">
          {workspaceItems.map((item) => renderMenuItem(item, mobile, compact))}
        </div>

        <div className="my-3 h-px bg-white/[0.055]" />
        <div className="space-y-0.5">
          {creationItems.map((item) => renderMenuItem(item, mobile, compact))}
        </div>

        {!compact && (
          <>
            <div className="my-3 h-px bg-white/[0.055]" />

            <button
              type="button"
              onClick={toggleRecent}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-600 hover:text-slate-400"
            >
              <span>Недавние чаты</span>
              {recentCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>

            {!recentCollapsed && (
              <div className="mt-1 space-y-0.5 pb-2">
                {filteredThreads.length > 0 ? (
                  filteredThreads.slice(0, mobile ? 20 : 12).map(renderThread)
                ) : (
                  <p className="px-2 py-3 text-xs text-slate-600">
                    Чаты не найдены
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {!mobile && !compact && (
        <div className="border-t border-white/[0.055] p-3">
          <div className="mb-2 rounded-2xl border border-violet-400/20 bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-3">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-medium text-white">3 / 3 генерации</span>
              <span className="text-slate-500">Сегодня</span>
            </div>
            <Link
              href="/pricing"
              className="mt-2 flex h-8 items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 text-xs font-medium text-white"
            >
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Улучшить план
            </Link>
          </div>
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-[11px] font-semibold text-white">
              {displayUser.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">
                {displayUser}
              </p>
              <p className="np-sidebar-plan truncate">
                {getPlanLabel(userPlan)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-lg p-2 text-slate-600 hover:bg-white/5 hover:text-white"
              title="Выйти"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!mobile && compact && (
        <div className="flex flex-col items-center gap-2 border-t border-white/[0.055] px-2 py-3">
          <Link
            href="/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-[11px] font-semibold text-white"
            title={displayUser}
            aria-label="Открыть профиль"
          >
            {displayUser.slice(0, 1).toUpperCase()}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white/5 hover:text-white"
            title="Выйти"
            aria-label="Выйти"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#03050a]/92 px-4 backdrop-blur-xl lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white"
          aria-label="Открыть меню"
        >
          <Menu className="h-5 w-5" />
        </button>
        <BrandMark
          compact={false}
          className="gap-2 [&>div]:h-8 [&>div]:w-8 [&>div]:rounded-xl [&>span]:text-sm"
        />
        <button
          type="button"
          onClick={createNewChat}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-300 hover:bg-white/5 hover:text-white"
          aria-label="Новый чат"
        >
          <SquarePen className="h-5 w-5" />
        </button>
      </header>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-white/[0.055] bg-[#03050a]/96 backdrop-blur-xl transition-[width] duration-300 lg:flex",
          desktopCollapsed ? "w-[72px]" : "w-[248px]",
        )}
      >
        {sidebarContents(false, desktopCollapsed)}
      </aside>

      {!userEmail && (
        <div className="fixed right-6 top-5 z-30 hidden items-center gap-2 lg:flex">
          <Link
            href="/sign-in"
            className="flex h-9 items-center rounded-xl border border-white/[0.1] bg-[#080b13]/90 px-4 text-xs font-medium text-slate-200 backdrop-blur-xl transition hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white"
          >
            Войти
          </Link>
          <Link
            href="/sign-up"
            className="flex h-9 items-center rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-4 text-xs font-medium text-white shadow-[0_8px_24px_rgba(79,70,229,0.28)] transition hover:brightness-110"
          >
            Регистрация
          </Link>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/72 backdrop-blur-[2px]"
          />
          <aside className="relative flex h-full w-[86%] max-w-[360px] flex-col border-r border-white/[0.07] bg-[#03050a] shadow-[30px_0_80px_rgba(0,0,0,0.55)]">
            {sidebarContents(true)}
          </aside>
        </div>
      )}
    </>
  );
}
