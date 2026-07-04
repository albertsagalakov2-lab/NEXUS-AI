"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Download,
  Film,
  Loader2,
  Play,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type VideoGeneration = {
  id: string
  user_id: string
  prompt: string
  style: string | null
  duration_seconds: number | null
  aspect_ratio: string | null
  video_url: string | null
  thumbnail_url: string | null
  status: string
  error_message: string | null
  created_at: string
}

const styles = [
  { value: "cinematic", label: "Кинематографичный" },
  { value: "realistic", label: "Реализм" },
  { value: "anime", label: "Аниме" },
  { value: "commercial", label: "Рекламный ролик" },
  { value: "fantasy", label: "Фэнтези" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "documentary", label: "Документальный стиль" },
  { value: "3d-animation", label: "3D-анимация" },
]

const aspectRatios = [
  { value: "16:9", label: "Горизонтально 16:9" },
  { value: "9:16", label: "Вертикально 9:16" },
  { value: "1:1", label: "Квадрат 1:1" },
  { value: "4:3", label: "Стандарт 4:3" },
]

const durations = [
  { value: "5", label: "5 секунд" },
  { value: "10", label: "10 секунд" },
  { value: "15", label: "15 секунд" },
]

const examples = [
  "Футуристический город ночью, камера плавно летит между небоскрёбами",
  "Космонавт идёт по красной планете, кинематографичный свет",
  "Рекламный ролик кофе: чашка на столе, пар, утреннее солнце",
  "Дракон летит над горами на закате, эпичная сцена",
]

function getStyleLabel(value?: string | null) {
  return styles.find((item) => item.value === value)?.label || "Кинематографичный"
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || "Request failed")
  }

  return data
}

export default function VideoGenerationPage() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("cinematic")
  const [aspectRatio, setAspectRatio] = useState("16:9")
  const [durationSeconds, setDurationSeconds] = useState("5")

  const [videos, setVideos] = useState<VideoGeneration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [error, setError] = useState("")

  const latestVideo = videos[0] || null

  const loadVideos = async () => {
    try {
      setError("")

      const data = await fetchJson("/api/videos")

      setVideos(data.videos || [])
    } catch (error) {
      console.error("Load videos error:", error)
      setError("Не получилось загрузить историю видео.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadVideos()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setError("")

    try {
      const data = await fetchJson("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          aspect_ratio: aspectRatio,
          duration_seconds: Number(durationSeconds),
        }),
      })

      const video = data.video as VideoGeneration

      setVideos((prev) => [video, ...prev])
      setPrompt("")
    } catch (error) {
      console.error("Generate video error:", error)
      setError("Не получилось создать демо-видео.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return

    setDeletingId(id)
    setError("")

    try {
      await fetchJson(`/api/videos/${id}`, {
        method: "DELETE",
      })

      setVideos((prev) => prev.filter((video) => video.id !== id))
    } catch (error) {
      console.error("Delete video error:", error)
      setError("Не получилось удалить видео.")
    } finally {
      setDeletingId("")
    }
  }

  const handleOpen = (url?: string | null) => {
    if (!url) return

    window.open(url, "_blank")
  }

  return (
    <div className="min-h-screen p-6 pt-16 md:p-8 md:pt-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Film className="h-5 w-5" />
            <span className="text-sm font-medium">Генерация видео</span>
          </div>

          <h1 className="mb-2 text-3xl font-bold">
            Создавайте видео с помощью AI
          </h1>

          <p className="text-muted-foreground">
            Сейчас страница работает в демо-режиме: запросы сохраняются в
            Supabase, а вместо реального видео показывается демо-превью.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          Реальный API генерации видео подключим позже. Сейчас мы готовим
          интерфейс, историю и базу данных.
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          <div className="order-2 space-y-6 lg:order-1">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Последний результат</CardTitle>
                <CardDescription>
                  Здесь отображается последнее созданное демо-видео
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : latestVideo?.thumbnail_url ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                    <div className="relative aspect-video bg-secondary">
                      <img
                        src={latestVideo.thumbnail_url}
                        alt={latestVideo.prompt}
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/90 shadow-lg">
                          <Play className="ml-1 h-6 w-6 text-primary" />
                        </div>
                      </div>

                      <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
                        Демо
                      </Badge>
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {getStyleLabel(latestVideo.style)}
                        </Badge>
                        <Badge variant="outline">
                          {latestVideo.aspect_ratio || "16:9"}
                        </Badge>
                        <Badge variant="outline">
                          {latestVideo.duration_seconds || 5} сек.
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {latestVideo.prompt}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpen(latestVideo.thumbnail_url)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Открыть превью
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(latestVideo.id)}
                          disabled={deletingId === latestVideo.id}
                        >
                          {deletingId === latestVideo.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-center">
                    <Film className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Пока нет видео</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Введите описание и создайте первое демо-видео
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">История видео</CardTitle>
                <CardDescription>
                  Сохраняется в Supabase для текущего аккаунта
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : videos.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {videos.map((video) => (
                      <div
                        key={video.id}
                        className="group overflow-hidden rounded-xl border border-border bg-secondary/40"
                      >
                        <div className="relative aspect-video bg-secondary">
                          {video.thumbnail_url ? (
                            <img
                              src={video.thumbnail_url}
                              alt={video.prompt}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Film className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background/90">
                              <Play className="ml-0.5 h-4 w-4 text-primary" />
                            </div>
                          </div>

                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={() => handleOpen(video.thumbnail_url)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => handleDelete(video.id)}
                              disabled={deletingId === video.id}
                            >
                              {deletingId === video.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 p-3">
                          <p className="line-clamp-2 text-sm font-medium">
                            {video.prompt}
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{getStyleLabel(video.style)}</span>
                            <span>·</span>
                            <span>{video.aspect_ratio || "16:9"}</span>
                            <span>·</span>
                            <span>{video.duration_seconds || 5} сек.</span>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {formatDate(video.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                    <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">История пока пустая</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Созданные видео появятся здесь
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="order-1 lg:order-2">
            <Card className="sticky top-8 border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">Настройки генерации</CardTitle>
                <CardDescription>
                  Опишите видео, которое хотите получить
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Описание</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Например: камера летит над футуристическим городом ночью..."
                    className="min-h-[130px] resize-none border-border bg-secondary"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Стиль</Label>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="border-border bg-secondary">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {styles.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Длительность</Label>
                  <Select
                    value={durationSeconds}
                    onValueChange={setDurationSeconds}
                  >
                    <SelectTrigger className="border-border bg-secondary">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {durations.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Формат</Label>

                  <div className="grid grid-cols-2 gap-2">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.value}
                        type="button"
                        onClick={() => setAspectRatio(ratio.value)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm transition-colors",
                          aspectRatio === ratio.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Создаём...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Создать демо
                    </>
                  )}
                </Button>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Примеры запросов</p>

                  <div className="space-y-2">
                    {examples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setPrompt(example)}
                        className="w-full rounded-lg border border-border bg-secondary/50 p-3 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Демо-режим · история сохраняется в Supabase
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
