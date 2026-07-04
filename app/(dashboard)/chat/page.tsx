"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  ArrowRight,
  Copy,
  Download,
  Film,
  ImageIcon,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
  WandSparkles,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

type MessageRole = "user" | "assistant"

interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
}

interface ChatRow {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface MessageRow {
  id: string
  role: MessageRole
  content: string
  created_at: string
}

type RecentGeneration = {
  id: string
  prompt: string
  url: string
  kind: "image" | "video"
}

const ACTIVE_THREAD_STORAGE_KEY = "nexusai_active_chat_id"

const suggestions = [
  {
    label: "Идея для изображения",
    text: "Футуристический город на закате, неоновые вывески и летающие машины",
    icon: ImageIcon,
  },
  {
    label: "Идея для видео",
    text: "Неоновый дрифт в дождливом городе, кинематографичный свет",
    icon: Film,
  },
]

function createTempId() {
  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createTitleFromMessage(content: string) {
  const clean = content.replace(/\s+/g, " ").trim()
  if (!clean) return "Новый чат"
  return clean.length > 42 ? `${clean.slice(0, 42)}...` : clean
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    timestamp: new Date(row.created_at),
  }
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || "Request failed")
  return data
}

function refreshSidebarChats() {
  window.dispatchEvent(new Event("storage"))
  window.dispatchEvent(new Event("nexusai-chats-updated"))
}

function ChatPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const chatIdFromUrl = searchParams.get("id")

  const [activeChatId, setActiveChatId] = useState("")
  const [chatTitle, setChatTitle] = useState("Новый чат")
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [recentGenerations, setRecentGenerations] = useState<RecentGeneration[]>([])

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEmptyChat = messages.length === 0

  useEffect(() => {
    let cancelled = false

    async function initChat() {
      setIsReady(false)
      setIsLoadingMessages(true)

      try {
        const chatsData = await fetchJson("/api/chats")
        const chats: ChatRow[] = chatsData.chats || []

        let targetChat = chatIdFromUrl
          ? chats.find((chat) => chat.id === chatIdFromUrl) || null
          : chats[0] || null

        if (!targetChat) {
          const createData = await fetchJson("/api/chats", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Новый чат" }),
          })
          targetChat = createData.chat
        }

        if (!targetChat) throw new Error("Не получилось создать чат")

        const messagesData = await fetchJson(`/api/chats/${targetChat.id}/messages`)
        const loadedMessages: Message[] = (messagesData.messages || []).map(mapMessage)

        if (cancelled) return

        setActiveChatId(targetChat.id)
        setChatTitle(targetChat.title || "Новый чат")
        setMessages(loadedMessages)
        window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, targetChat.id)
        refreshSidebarChats()

        if (chatIdFromUrl !== targetChat.id) {
          router.replace(`/chat?id=${targetChat.id}`)
        }
      } catch (error) {
        console.error("Init chat error:", error)
      } finally {
        if (!cancelled) {
          setIsReady(true)
          setIsLoadingMessages(false)
        }
      }
    }

    initChat()
    return () => {
      cancelled = true
    }
  }, [chatIdFromUrl, router])

  useEffect(() => {
    let cancelled = false

    async function loadRecentGenerations() {
      try {
        const [imagesResponse, videosResponse] = await Promise.all([
          fetch("/api/images", { cache: "no-store" }),
          fetch("/api/videos", { cache: "no-store" }),
        ])

        const imagesData = await imagesResponse.json().catch(() => ({}))
        const videosData = await videosResponse.json().catch(() => ({}))

        if (cancelled) return

        const images: RecentGeneration[] = (imagesData.images || [])
          .filter((item: { image_url?: string }) => item.image_url)
          .slice(0, 4)
          .map((item: { id: string; prompt: string; image_url: string }) => ({
            id: item.id,
            prompt: item.prompt,
            url: item.image_url,
            kind: "image" as const,
          }))

        const videos: RecentGeneration[] = (videosData.videos || [])
          .filter((item: { thumbnail_url?: string }) => item.thumbnail_url)
          .slice(0, 4)
          .map((item: { id: string; prompt: string; thumbnail_url: string }) => ({
            id: item.id,
            prompt: item.prompt,
            url: item.thumbnail_url,
            kind: "video" as const,
          }))

        setRecentGenerations([...images, ...videos].slice(0, 4))
      } catch (error) {
        console.error("Recent generations error:", error)
      }
    }

    loadRecentGenerations()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const createNewChat = async () => {
    if (isLoading || isLoadingMessages) return
    try {
      const data = await fetchJson("/api/chats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый чат" }),
      })
      const chat: ChatRow = data.chat
      setActiveChatId(chat.id)
      setChatTitle(chat.title || "Новый чат")
      setMessages([])
      setInput("")
      window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, chat.id)
      refreshSidebarChats()
      router.push(`/chat?id=${chat.id}`)
    } catch (error) {
      console.error("Create chat error:", error)
    }
  }

  const deleteCurrentChat = async () => {
    if (!activeChatId || isLoading || isLoadingMessages) return
    try {
      await fetchJson(`/api/chats/${activeChatId}`, { method: "DELETE" })
      const chatsData = await fetchJson("/api/chats")
      const chats: ChatRow[] = chatsData.chats || []

      if (chats.length > 0) {
        const nextChat = chats[0]
        setActiveChatId(nextChat.id)
        setChatTitle(nextChat.title || "Новый чат")
        const messagesData = await fetchJson(`/api/chats/${nextChat.id}/messages`)
        setMessages((messagesData.messages || []).map(mapMessage))
        window.localStorage.setItem(ACTIVE_THREAD_STORAGE_KEY, nextChat.id)
        router.replace(`/chat?id=${nextChat.id}`)
      } else {
        await createNewChat()
      }
      refreshSidebarChats()
    } catch (error) {
      console.error("Delete chat error:", error)
    }
  }

  const resetCurrentChat = async () => {
    if (!activeChatId || isLoading || isLoadingMessages) return
    try {
      await fetchJson(`/api/chats/${activeChatId}/messages`, { method: "DELETE" })
      setMessages([])
      setChatTitle("Новый чат")
      setInput("")
      refreshSidebarChats()
    } catch (error) {
      console.error("Reset chat error:", error)
    }
  }

  const saveMessageToSupabase = async (
    chatId: string,
    role: MessageRole,
    content: string,
    title?: string
  ) => {
    const data = await fetchJson(`/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, title }),
    })
    return mapMessage(data.message)
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !activeChatId) return

    const content = input.trim()
    const nextTitle = chatTitle === "Новый чат" ? createTitleFromMessage(content) : undefined
    const tempUserMessage: Message = {
      id: createTempId(),
      role: "user",
      content,
      timestamp: new Date(),
    }
    const messagesForAi = [...messages, tempUserMessage]

    setMessages(messagesForAi)
    setInput("")
    setIsLoading(true)
    if (nextTitle) setChatTitle(nextTitle)

    try {
      const savedUserMessage = await saveMessageToSupabase(
        activeChatId,
        "user",
        content,
        nextTitle
      )
      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempUserMessage.id ? savedUserMessage : message
        )
      )

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForAi.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Chat request failed")

      const aiContent = data.message || "AI не вернул ответ."
      const tempAssistantMessage: Message = {
        id: createTempId(),
        role: "assistant",
        content: aiContent,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, tempAssistantMessage])

      const savedAssistantMessage = await saveMessageToSupabase(
        activeChatId,
        "assistant",
        aiContent
      )
      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempAssistantMessage.id ? savedAssistantMessage : message
        )
      )
      refreshSidebarChats()
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: createTempId(),
          role: "assistant",
          content:
            "Ошибка: не получилось получить ответ от AI. Проверь API-ключ, модель и логи Vercel.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    await sendMessage()
  }

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      await sendMessage()
    }
  }

  const chooseSuggestion = (text: string) => {
    setInput(text)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }

  const inputForm = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="rounded-[1.35rem] border border-fuchsia-400/35 bg-[#080d27]/95 p-2 shadow-[0_0_35px_rgba(124,58,237,0.16)] backdrop-blur-xl">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Опишите, что хотите создать..."
          className="min-h-[64px] resize-none border-0 bg-transparent px-3 py-3 text-[15px] text-white shadow-none placeholder:text-slate-500 focus-visible:ring-0"
          rows={2}
          disabled={isLoading || isLoadingMessages}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-1 pt-2">
          <Link
            href="/image"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300 transition hover:border-fuchsia-400/30 hover:text-white"
          >
            <ImageIcon className="h-4 w-4 text-cyan-300" />
            Фото
          </Link>
          <Link
            href="/video"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-xs text-slate-300 transition hover:border-fuchsia-400/30 hover:text-white"
          >
            <Film className="h-4 w-4 text-fuchsia-300" />
            Видео
          </Link>
          <span className="hidden rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-500 sm:inline-flex">
            Enter — отправить
          </span>

          <Button
            type="submit"
            disabled={!input.trim() || isLoading || isLoadingMessages}
            className="ml-auto h-10 rounded-xl border-0 bg-gradient-to-r from-fuchsia-500 via-violet-500 to-blue-500 px-5 text-white shadow-[0_8px_24px_rgba(124,58,237,0.3)] hover:brightness-110"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Отправить
          </Button>
        </div>
      </div>
    </form>
  )

  if (!isReady) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Sparkles className="h-4 w-4 animate-pulse text-fuchsia-400" />
          Загружаем NeiroPeiro...
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#040718] pt-14 md:pt-0">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_8%,rgba(124,58,237,0.16),transparent_30%),radial-gradient(circle_at_82%_24%,rgba(14,165,233,0.12),transparent_24%)]" />

      <div className="relative grid min-h-screen xl:grid-cols-[minmax(0,1fr)_330px]">
        <section className="flex min-h-screen min-w-0 flex-col border-r border-white/8">
          <header className="flex h-[76px] items-center justify-between border-b border-white/8 px-5 md:px-7">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-fuchsia-300/80">
                AI workspace
              </p>
              <h1 className="truncate text-base font-semibold text-white">
                {isEmptyChat ? "Создавайте фото и видео с ИИ" : chatTitle}
              </h1>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={createNewChat} title="Новый чат" className="text-slate-400 hover:bg-white/[0.06] hover:text-white">
                <Plus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={resetCurrentChat} title="Очистить чат" className="text-slate-400 hover:bg-white/[0.06] hover:text-white">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={deleteCurrentChat} title="Удалить чат" className="text-slate-400 hover:bg-rose-500/10 hover:text-rose-300">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </header>

          {isEmptyChat ? (
            <div className="flex flex-1 flex-col justify-center px-4 py-8 md:px-8 lg:px-10">
              <div className="mx-auto w-full max-w-4xl">
                <div className="mb-7 max-w-3xl">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Чат, идеи, фото и видео в одном месте
                  </div>
                  <h2 className="text-balance text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
                    Создавайте фото <span className="brand-gradient-text">и видео с ИИ</span>
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                    Опишите идею обычными словами. NeiroPeiro поможет улучшить запрос, придумать концепцию и перейти к генерации.
                  </p>
                </div>

                <div className="mb-6 grid gap-3 md:grid-cols-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.label}
                      type="button"
                      onClick={() => chooseSuggestion(suggestion.text)}
                      className="group rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-fuchsia-400/30 hover:bg-white/[0.055]"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-sm font-medium text-fuchsia-300">
                          <suggestion.icon className="h-4 w-4" />
                          {suggestion.label}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                      </div>
                      <p className="text-sm leading-5 text-slate-300">{suggestion.text}</p>
                    </button>
                  ))}
                </div>

                {inputForm}
              </div>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4 py-6 md:px-8" ref={scrollAreaRef}>
                <div className="mx-auto max-w-4xl space-y-6 pb-3">
                  {messages.map((message) => (
                    <div key={message.id} className="flex gap-3">
                      <Avatar className="mt-1 h-9 w-9 shrink-0 border border-white/10">
                        <AvatarFallback
                          className={cn(
                            message.role === "assistant"
                              ? "bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white"
                              : "bg-gradient-to-br from-cyan-400 to-emerald-400 text-[#04111b]"
                          )}
                        >
                          {message.role === "assistant" ? (
                            <Sparkles className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2 text-xs">
                          <span className={cn("font-medium", message.role === "assistant" ? "text-fuchsia-300" : "text-cyan-300")}>
                            {message.role === "assistant" ? "NeiroPeiro AI" : "Вы"}
                          </span>
                          <span className="text-slate-600">
                            {message.timestamp.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "group relative rounded-2xl border px-4 py-3.5",
                            message.role === "assistant"
                              ? "border-fuchsia-400/15 bg-gradient-to-br from-fuchsia-500/[0.07] to-blue-500/[0.04]"
                              : "border-white/8 bg-white/[0.035]"
                          )}
                        >
                          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">{message.content}</p>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(message.content)}
                            className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-600 opacity-0 hover:bg-white/[0.06] hover:text-white group-hover:opacity-100"
                            title="Копировать"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-blue-500 text-white">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <span>NeiroPeiro печатает</span>
                      <span className="flex gap-1">
                        <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-fuchsia-400 [animation-delay:-0.3s]" />
                        <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.15s]" />
                        <i className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                      </span>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="border-t border-white/8 bg-[#05091d]/85 p-4 backdrop-blur md:px-8 md:py-5">
                <div className="mx-auto max-w-4xl">{inputForm}</div>
              </div>
            </>
          )}
        </section>

        <aside className="hidden min-h-screen bg-[#060a20]/72 p-4 xl:block">
          <div className="sticky top-4 space-y-4">
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-fuchsia-500/10 to-blue-500/5 p-4">
              <div className="relative mx-auto aspect-square max-w-[220px]">
                <Image src="/neiropeiro-mascot.png" alt="Маскот NeiroPeiro" fill sizes="220px" className="object-contain drop-shadow-[0_0_30px_rgba(59,130,246,0.25)]" />
              </div>
              <h3 className="mt-1 text-lg font-semibold text-white">
                Привет! Я <span className="brand-gradient-text">NeiroPeiro</span>
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Помогу придумать промпт, создать изображение или подготовить идею для видео.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">Последние генерации</h3>
                <Link href="/image" className="text-xs text-slate-500 hover:text-fuchsia-300">Показать все</Link>
              </div>

              {recentGenerations.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {recentGenerations.map((item) => (
                    <a
                      key={`${item.kind}-${item.id}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
                      title={item.prompt}
                    >
                      <img src={item.url} alt={item.prompt} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      <span className="absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur">
                        {item.kind === "video" ? <Film className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                        <Download className="h-3.5 w-3.5" />
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-7 text-center">
                  <WandSparkles className="mx-auto mb-2 h-7 w-7 text-fuchsia-400/70" />
                  <p className="text-xs leading-5 text-slate-500">
                    Здесь появятся ваши изображения и превью видео.
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <h3 className="mb-4 text-sm font-semibold text-white">Почему NeiroPeiro</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <Zap className="mt-0.5 h-4 w-4 text-cyan-300" />
                  <div><p className="text-sm text-white">Быстро</p><p className="text-xs text-slate-500">Результат за несколько шагов</p></div>
                </div>
                <div className="flex gap-3">
                  <MessageSquare className="mt-0.5 h-4 w-4 text-fuchsia-300" />
                  <div><p className="text-sm text-white">Понятно</p><p className="text-xs text-slate-500">Чат помогает сформулировать идею</p></div>
                </div>
                <div className="flex gap-3">
                  <Sparkles className="mt-0.5 h-4 w-4 text-blue-300" />
                  <div><p className="text-sm text-white">В одном месте</p><p className="text-xs text-slate-500">Текст, изображения и видео</p></div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-[#040718]">
          <div className="text-sm text-slate-400">Загрузка...</div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}
