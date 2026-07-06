"use client"

import Image from "next/image"
import Link from "next/link"
import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowUp,
  CircleHelp,
  Copy,
  Film,
  ImageIcon,
  Loader2,
  MessageCircleQuestion,
  Paperclip,
  Send,
  Sparkles,
  Trash2,
  User,
  WandSparkles,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
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

const ACTIVE_THREAD_STORAGE_KEY = "nexusai_active_chat_id"

const quickActions = [
  {
    label: "Создать изображение",
    description: "По описанию",
    prompt: "Помоги составить подробный промпт для красивого изображения: ",
    icon: ImageIcon,
  },
  {
    label: "Придумать сценарий",
    description: "Для видео",
    prompt: "Придумай короткий кинематографичный сценарий для видео на тему: ",
    icon: Film,
  },
  {
    label: "Улучшить фото",
    description: "Качество и детали",
    prompt: "Подскажи, как улучшить фотографию и составь промпт для редактирования: ",
    icon: WandSparkles,
  },
  {
    label: "Задать вопрос",
    description: "Получить ответ",
    prompt: "",
    icon: CircleHelp,
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
  const [isGuest, setIsGuest] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isEmptyChat = messages.length === 0

  useEffect(() => {
    let cancelled = false

    async function initChat() {
      setIsReady(false)
      setIsLoadingMessages(true)

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          if (cancelled) return
          setIsGuest(true)
          setActiveChatId("")
          setChatTitle("Новый чат")
          setMessages([])
          return
        }

        setIsGuest(false)
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
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
    if (!window.confirm("Удалить этот чат?")) return

    try {
      await fetchJson(`/api/chats/${activeChatId}`, { method: "DELETE" })
      const chatsData = await fetchJson("/api/chats")
      const chats: ChatRow[] = chatsData.chats || []

      if (chats.length > 0) {
        const nextChat = chats[0]
        const messagesData = await fetchJson(`/api/chats/${nextChat.id}/messages`)
        setActiveChatId(nextChat.id)
        setChatTitle(nextChat.title || "Новый чат")
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
    if (!input.trim() || isLoading) return

    if (isGuest) {
      window.sessionStorage.setItem("neiropeiro_guest_prompt", input.trim())
      router.push("/sign-in?next=/chat")
      return
    }

    if (!activeChatId) return

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

      setMessages((current) =>
        current.map((message) =>
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

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Chat request failed")

      const aiContent = data.message || "AI не вернул ответ."
      const tempAssistantMessage: Message = {
        id: createTempId(),
        role: "assistant",
        content: aiContent,
        timestamp: new Date(),
      }

      setMessages((current) => [...current, tempAssistantMessage])

      const savedAssistantMessage = await saveMessageToSupabase(
        activeChatId,
        "assistant",
        aiContent
      )

      setMessages((current) =>
        current.map((message) =>
          message.id === tempAssistantMessage.id
            ? savedAssistantMessage
            : message
        )
      )
      refreshSidebarChats()
    } catch (error) {
      console.error("Chat error:", error)
      setMessages((current) => [
        ...current,
        {
          id: createTempId(),
          role: "assistant",
          content:
            "Не получилось получить ответ. Проверьте ключ OpenRouter, модель и логи Vercel.",
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

  const chooseQuickAction = (prompt: string) => {
    setInput(prompt)
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus()
      textareaRef.current?.setSelectionRange(prompt.length, prompt.length)
    })
  }

  const copyToClipboard = async (content: string) => {
    await navigator.clipboard.writeText(content)
  }

  const composer = (
    <form onSubmit={handleSubmit} className="w-full min-w-0 max-w-full">
      <div className="np-composer w-full min-w-0 max-w-full">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isEmptyChat ? "Что вы хотите создать?" : "Напишите сообщение..."}
          rows={2}
          disabled={isLoading || isLoadingMessages}
          className="min-h-[58px] w-full min-w-0 max-w-full resize-none bg-transparent px-4 pt-3 text-[16px] leading-6 text-white outline-none placeholder:text-slate-600 sm:min-h-[66px] sm:text-[15px]"
        />

        <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden px-2 pb-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-white/[0.055] hover:text-white"
            title="Прикрепить файл"
          >
            <Paperclip className="h-[18px] w-[18px]" />
          </button>

          <Link href="/image" className="np-composer-chip">
            <ImageIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Изображение</span>
          </Link>

          <Link href="/video" className="np-composer-chip">
            <Film className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Видео</span>
          </Link>

          <button
            type="submit"
            disabled={!input.trim() || isLoading || isLoadingMessages}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_7px_20px_rgba(79,70,229,0.38)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Отправить"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isEmptyChat ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </form>
  )

  if (!isReady) {
    return (
      <div className="flex h-[calc(100dvh-64px)] items-center justify-center overflow-hidden bg-[#03050a] lg:h-screen">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Sparkles className="h-4 w-4 animate-pulse text-violet-400" />
          Загружаем NeiroPeiro...
        </div>
      </div>
    )
  }

  return (
    <div className="neiropeiro-workspace relative flex h-[calc(100dvh-64px)] w-full max-w-[100vw] min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-hidden overscroll-none lg:h-screen">
      <div className="pointer-events-none absolute inset-0 neiropeiro-stars" />

      {!isGuest && (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 lg:right-5 lg:top-4">
        <button
          type="button"
          onClick={deleteCurrentChat}
          className="np-icon-button hover:border-rose-400/20 hover:text-rose-300"
          title="Удалить чат"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        </div>
      )}

      {isEmptyChat ? (
        <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col items-center justify-end overflow-x-hidden overflow-y-hidden px-4 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-4 sm:px-6 sm:pb-8 lg:justify-center lg:overflow-y-auto lg:py-12">
          <div className="w-full min-w-0 max-w-[min(760px,calc(100vw-32px))]">
            {composer}

            <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-4 sm:gap-2.5">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => chooseQuickAction(action.prompt)}
                  className="np-quick-action"
                >
                  <action.icon className="h-[18px] w-[18px] shrink-0 text-blue-400" />
                  <span className="min-w-0 text-left">
                    <strong className="block truncate text-[12px] font-medium text-slate-200 sm:text-[13px]">
                      {action.label}
                    </strong>
                    <small className="block truncate text-[10px] text-slate-600 sm:text-[11px]">
                      {action.description}
                    </small>
                  </span>
                </button>
              ))}
            </div>

            {isGuest && (
              <p className="mt-5 text-center text-[11px] text-slate-600">
                Вы можете посмотреть сервис без регистрации. Для отправки запроса и сохранения истории потребуется вход.
              </p>
            )}

            <p className="mt-10 hidden text-center text-[11px] text-slate-700 sm:block">
              Enter — отправить · Shift + Enter — новая строка
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-[1] flex-1 overflow-y-auto px-3 pb-5 pt-16 sm:px-5 lg:px-8">
            <div className="mx-auto w-full max-w-[820px] space-y-6">
              <div className="mb-8 text-center">
                <p className="truncate text-xs text-slate-600">{chatTitle}</p>
              </div>

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2.5 sm:gap-3",
                    message.role === "user" && "justify-end"
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/[0.08] bg-[#0a0e19]">
                      <Image
                        src="/neiropeiro-mascot.png"
                        alt="NeiroPeiro"
                        fill
                        sizes="32px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div
                    className={cn(
                      "group relative max-w-[88%] sm:max-w-[78%]",
                      message.role === "user" && "order-first"
                    )}
                  >
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-3 text-[13px] leading-6 sm:text-sm",
                        message.role === "user"
                          ? "rounded-tr-md bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_10px_30px_rgba(37,99,235,0.16)]"
                          : "rounded-tl-md border border-white/[0.065] bg-[#0b0f18]/88 text-slate-200"
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    </div>

                    <div
                      className={cn(
                        "mt-1 flex items-center gap-1.5 text-[9px] text-slate-700",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <span>
                        {message.timestamp.toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(message.content)}
                        className="rounded p-1 opacity-0 transition hover:bg-white/5 hover:text-slate-400 group-hover:opacity-100"
                        title="Копировать"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {message.role === "user" && (
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 text-[#031018]">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8 overflow-hidden rounded-full border border-white/[0.08] bg-[#0a0e19]">
                    <Image
                      src="/neiropeiro-mascot.png"
                      alt="NeiroPeiro"
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-white/[0.065] bg-[#0b0f18]/88 px-4 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="relative z-[2] border-t border-white/[0.05] bg-[#03050a]/82 px-3 py-3 backdrop-blur-xl sm:px-5 lg:px-8 lg:py-4">
            <div className="mx-auto w-full max-w-[820px]">{composer}</div>
          </div>
        </>
      )}
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[calc(100dvh-64px)] items-center justify-center overflow-hidden bg-[#03050a] lg:h-screen">
          <div className="text-sm text-slate-500">Загрузка...</div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}
