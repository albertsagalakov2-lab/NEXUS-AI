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
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react"
import { cn } from "@/lib/utils"

type ImageGeneration = {
  id: string
  user_id: string
  prompt: string
  style: string | null
  aspect_ratio: string | null
  image_url: string | null
  status: string
  created_at: string
}

const styles = [
  { value: "realistic", label: "Реализм" },
  { value: "anime", label: "Аниме" },
  { value: "digital-art", label: "Цифровое искусство" },
  { value: "cinematic", label: "Кинематографичный стиль" },
  { value: "oil-painting", label: "Масляная живопись" },
  { value: "watercolor", label: "Акварель" },
  { value: "sketch", label: "Скетч" },
  { value: "3d-render", label: "3D-рендер" },
]

const aspectRatios = [
  { value: "1:1", label: "Квадрат 1:1" },
  { value: "16:9", label: "Горизонтально 16:9" },
  { value: "9:16", label: "Вертикально 9:16" },
  { value: "4:3", label: "Стандарт 4:3" },
]

const examples = [
  "Футуристический город ночью, неон, дождь, кинематографичный свет",
  "Портрет космонавта в стиле цифрового искусства",
  "Уютная кофейня утром, мягкий свет, реализм",
  "Горы на закате, эпичный пейзаж, высокая детализация",
]

function getStyleLabel(value?: string | null) {
  return styles.find((item) => item.value === value)?.label || "Реализм"
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

export default function ImageGenerationPage() {
  const [prompt, setPrompt] = useState("")
  const [style, setStyle] = useState("realistic")
  const [aspectRatio, setAspectRatio] = useState("1:1")

  const [images, setImages] = useState<ImageGeneration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [error, setError] = useState("")

  const latestImage = images[0] || null

  const loadImages = async () => {
    try {
      setError("")

      const data = await fetchJson("/api/images")

      setImages(data.images || [])
    } catch (error) {
      console.error("Load images error:", error)
      setError("Не получилось загрузить историю изображений.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [])

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setError("")

    try {
      const data = await fetchJson("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          style,
          aspect_ratio: aspectRatio,
        }),
      })

      const image = data.image as ImageGeneration

      setImages((prev) => [image, ...prev])
      setPrompt("")
    } catch (error) {
      console.error("Generate image error:", error)
      setError("Не получилось создать демо-изображение.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return

    setDeletingId(id)
    setError("")

    try {
      await fetchJson(`/api/images/${id}`, {
        method: "DELETE",
      })

      setImages((prev) => prev.filter((image) => image.id !== id))
    } catch (error) {
      console.error("Delete image error:", error)
      setError("Не получилось удалить изображение.")
    } finally {
      setDeletingId("")
    }
  }

  const handleDownload = (url?: string | null) => {
    if (!url) return

    window.open(url, "_blank")
  }

  return (
    <div className="min-h-screen p-6 pt-16 md:p-8 md:pt-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <ImageIcon className="h-5 w-5" />
            <span className="text-sm font-medium">
              Генерация изображений
            </span>
          </div>

          <h1 className="mb-2 text-3xl font-bold">
            Создавайте изображения с помощью AI
          </h1>

          <p className="text-muted-foreground">
            Сейчас страница работает в демо-режиме: запросы сохраняются в
            Supabase, а изображение создаётся как временный пример.
          </p>
        </div>

        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/10 p-4 text-sm text-primary">
          Реальный API генерации изображений подключим позже. Сейчас мы
          подготавливаем историю, интерфейс и базу данных.
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
                  Здесь отображается последнее созданное демо-изображение
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : latestImage?.image_url ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-secondary">
                    <div className="relative aspect-square">
                      <img
                        src={latestImage.image_url}
                        alt={latestImage.prompt}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {getStyleLabel(latestImage.style)}
                        </Badge>
                        <Badge variant="outline">
                          {latestImage.aspect_ratio || "1:1"}
                        </Badge>
                        <Badge variant="outline">Демо</Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {latestImage.prompt}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownload(latestImage.image_url)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Открыть
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(latestImage.id)}
                          disabled={deletingId === latestImage.id}
                        >
                          {deletingId === latestImage.id ? (
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
                  <div className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 text-center">
                    <ImageIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Пока нет изображений</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Введите описание и создайте первое демо-изображение
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg">История изображений</CardTitle>
                <CardDescription>
                  Сохраняется в Supabase для текущего аккаунта
                </CardDescription>
              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex min-h-[160px] items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : images.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {images.map((image) => (
                      <div
                        key={image.id}
                        className="group overflow-hidden rounded-xl border border-border bg-secondary/40"
                      >
                        <div className="relative aspect-square bg-secondary">
                          {image.image_url ? (
                            <img
                              src={image.image_url}
                              alt={image.prompt}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}

                          <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8"
                              onClick={() => handleDownload(image.image_url)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>

                            <Button
                              type="button"
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8"
                              onClick={() => handleDelete(image.id)}
                              disabled={deletingId === image.id}
                            >
                              {deletingId === image.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2 p-3">
                          <p className="line-clamp-2 text-sm font-medium">
                            {image.prompt}
                          </p>

                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{getStyleLabel(image.style)}</span>
                            <span>·</span>
                            <span>{image.aspect_ratio || "1:1"}</span>
                          </div>

                          <p className="text-xs text-muted-foreground">
                            {formatDate(image.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-[160px] flex-col items-center justify-center text-center">
                    <Sparkles className="mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">
                      История пока пустая
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Созданные изображения появятся здесь
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
                  Опишите, что хотите получить
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="prompt">Описание</Label>
                  <Textarea
                    id="prompt"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Например: футуристический город ночью, неон, дождь..."
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
