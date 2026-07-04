"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

import {
  Calendar,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Save,
  Sparkles,
  User,
  Video,
} from "lucide-react"

function formatDate(value?: string | null) {
  if (!value) return "—"

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value))
}

function getPlanLabel(plan?: string | null) {
  if (!plan || plan === "free") return "Бесплатный тариф"
  return plan
}

export default function ProfilePage() {
  const router = useRouter()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [userId, setUserId] = useState("")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [plan, setPlan] = useState("free")
  const [createdAt, setCreatedAt] = useState<string | null>(null)

  const [chatsCount, setChatsCount] = useState(0)
  const [messagesCount, setMessagesCount] = useState(0)
  const [imagesCount, setImagesCount] = useState(0)
  const [videosCount, setVideosCount] = useState(0)

  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient()

      setIsLoading(true)
      setErrorMessage("")

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/sign-in")
        return
      }

      setUserId(user.id)
      setEmail(user.email || "")

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (!profile) {
        await supabase.from("profiles").insert({
          id: user.id,
          email: user.email || "",
          full_name: "",
          plan: "free",
        })

        setName("")
        setPlan("free")
        setCreatedAt(user.created_at || null)
      } else {
        setName(profile.full_name || "")
        setPlan(profile.plan || "free")
        setCreatedAt(profile.created_at || user.created_at || null)
      }

      const { count: chats } = await supabase
        .from("chats")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { count: messages } = await supabase
        .from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { count: images } = await supabase
        .from("image_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      const { count: videos } = await supabase
        .from("video_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)

      setChatsCount(chats || 0)
      setMessagesCount(messages || 0)
      setImagesCount(images || 0)
      setVideosCount(videos || 0)

      setIsLoading(false)
    }

    loadProfile()
  }, [router])

  const handleSave = async () => {
    if (!userId || isSaving) return

    const supabase = createClient()

    setIsSaving(true)
    setSuccessMessage("")
    setErrorMessage("")

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    setIsSaving(false)

    if (error) {
      setErrorMessage("Не получилось сохранить профиль.")
      return
    }

    setSuccessMessage("Профиль сохранён.")
    window.dispatchEvent(new Event("nexusai-chats-updated"))
  }

  const handleSignOut = async () => {
    const supabase = createClient()

    await supabase.auth.signOut()

    window.localStorage.removeItem("nexusai_active_chat_id")
    window.location.href = "/sign-in"
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Загружаем профиль...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pt-16 md:p-8 md:pt-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <User className="h-5 w-5" />
            <span className="text-sm font-medium">Профиль</span>
          </div>

          <h1 className="mb-2 text-3xl font-bold">Аккаунт NeiroPeiro</h1>

          <p className="text-muted-foreground">
            Ваши данные и статистика использования
          </p>
        </div>

        <div className="grid gap-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Данные аккаунта</CardTitle>
              <CardDescription>
                Информация загружается из Supabase
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-8 w-8 text-primary" />
                </div>

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold">
                    {name.trim() || "Пользователь NeiroPeiro"}
                  </h2>

                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {email}
                  </p>

                  <Badge
                    variant="secondary"
                    className="mt-2 bg-primary/10 text-primary"
                  >
                    <Sparkles className="mr-1 h-3 w-3" />
                    {getPlanLabel(plan)}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Имя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Введите имя"
                    className="border-border bg-secondary"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="border-border bg-secondary opacity-70"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Тариф
                  </div>
                  <div className="font-semibold">{getPlanLabel(plan)}</div>
                </div>

                <div className="rounded-lg border border-border bg-secondary/50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Дата регистрации
                  </div>
                  <div className="font-semibold">{formatDate(createdAt)}</div>
                </div>
              </div>

              {successMessage && (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохраняем...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Сохранить изменения
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Статистика</CardTitle>
              <CardDescription>
                Реальные данные по вашему аккаунту
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-border bg-secondary/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Чаты
                  </div>
                  <div className="text-3xl font-bold">{chatsCount}</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Сообщения
                  </div>
                  <div className="text-3xl font-bold">{messagesCount}</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="h-4 w-4" />
                    Изображения
                  </div>
                  <div className="text-3xl font-bold">{imagesCount}</div>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-5">
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Video className="h-4 w-4" />
                    Видео
                  </div>
                  <div className="text-3xl font-bold">{videosCount}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти из аккаунта
          </Button>
        </div>
      </div>
    </div>
  )
}
