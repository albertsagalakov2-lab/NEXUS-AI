"use client"

import { useEffect, useState } from "react"
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
import { Check, Loader2, Palette, Save, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

const colorPresets = [
  {
    name: "Зелёный",
    value: "#10b981",
    preview: "bg-emerald-500",
  },
  {
    name: "Светло-голубой",
    value: "#38bdf8",
    preview: "bg-sky-400",
  },
  {
    name: "Синий",
    value: "#3b82f6",
    preview: "bg-blue-500",
  },
  {
    name: "Фиолетовый",
    value: "#8b5cf6",
    preview: "bg-violet-500",
  },
  {
    name: "Розовый",
    value: "#ec4899",
    preview: "bg-pink-500",
  },
  {
    name: "Оранжевый",
    value: "#f97316",
    preview: "bg-orange-500",
  },
  {
    name: "Красный",
    value: "#ef4444",
    preview: "bg-red-500",
  },
]

const radiusPresets = [
  {
    name: "Строгий",
    value: "0.35rem",
  },
  {
    name: "Мягкий",
    value: "0.75rem",
  },
  {
    name: "Круглый",
    value: "1rem",
  },
  {
    name: "Очень круглый",
    value: "1.5rem",
  },
]

function applyPreview(primaryColor: string, radius: string, siteName: string) {
  const root = document.documentElement

  root.style.setProperty("--primary", primaryColor)
  root.style.setProperty("--ring", primaryColor)
  root.style.setProperty("--radius", radius)

  document.title = siteName || "NeiroPeiro"
}

export default function AppearancePage() {
  const [siteName, setSiteName] = useState("NeiroPeiro")
  const [primaryColor, setPrimaryColor] = useState("#8b5cf6")
  const [radius, setRadius] = useState("0.75rem")

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true)
      setError("")

      try {
        const response = await fetch("/api/appearance", {
          cache: "no-store",
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || "Не получилось загрузить настройки")
        }

        const nextSiteName = data.settings.site_name || "NeiroPeiro"
        const nextPrimaryColor =
          data.settings.primary_color || "#8b5cf6"
        const nextRadius = data.settings.radius || "0.75rem"

        setSiteName(nextSiteName)
        setPrimaryColor(nextPrimaryColor)
        setRadius(nextRadius)

        applyPreview(nextPrimaryColor, nextRadius, nextSiteName)
      } catch (error) {
        console.error("Load appearance settings error:", error)
        setError("Не получилось загрузить настройки внешнего вида.")
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    applyPreview(primaryColor, radius, siteName)
  }, [primaryColor, radius, siteName])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/appearance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_name: siteName,
          primary_color: primaryColor,
          radius,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Не получилось сохранить настройки")
      }

      window.localStorage.setItem("nexusai_site_name", siteName)
      window.dispatchEvent(new Event("nexusai-appearance-updated"))

      setMessage("Настройки сохранены.")
    } catch (error) {
      console.error("Save appearance settings error:", error)
      setError("Не получилось сохранить настройки.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Загружаем редактор...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pt-16 md:p-8 md:pt-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Palette className="h-5 w-5" />
            <span className="text-sm font-medium">Внешний вид</span>
          </div>

          <h1 className="mb-2 text-3xl font-bold">Редактор дизайна</h1>

          <p className="text-muted-foreground">
            Меняйте базовый стиль сайта без правки кода.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,360px]">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Настройки</CardTitle>
              <CardDescription>
                Название, основной цвет и скругление элементов
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="site-name">Название сайта</Label>
                <Input
                  id="site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="NeiroPeiro"
                  className="border-border bg-secondary"
                />
              </div>

              <div className="space-y-3">
                <Label>Основной цвет</Label>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {colorPresets.map((color) => {
                    const isActive = primaryColor === color.value

                    return (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setPrimaryColor(color.value)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/50 hover:bg-secondary"
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={cn("h-6 w-6 rounded-full", color.preview)}
                          />
                          <span className="text-sm font-medium">
                            {color.name}
                          </span>
                        </span>

                        {isActive && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Скругление элементов</Label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {radiusPresets.map((item) => {
                    const isActive = radius === item.value

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setRadius(item.value)}
                        className={cn(
                          "flex items-center justify-between rounded-xl border p-3 text-left transition-colors",
                          isActive
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/50 hover:bg-secondary"
                        )}
                      >
                        <span>
                          <span className="block text-sm font-medium">
                            {item.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.value}
                          </span>
                        </span>

                        {isActive && <Check className="h-4 w-4 text-primary" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {message && (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
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
                    Сохранить настройки
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="h-fit border-border bg-card lg:sticky lg:top-8">
            <CardHeader>
              <CardTitle>Предпросмотр</CardTitle>
              <CardDescription>
                Так будут выглядеть элементы сайта
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-secondary/50 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                    <Sparkles className="h-5 w-5 text-primary-foreground" />
                  </div>

                  <div>
                    <p className="font-semibold">{siteName || "NeiroPeiro"}</p>
                    <p className="text-xs text-muted-foreground">
                      Предпросмотр темы
                    </p>
                  </div>
                </div>

                <Badge className="mb-4">Активный цвет</Badge>

                <div className="space-y-2">
                  <Button className="w-full">Основная кнопка</Button>
                  <Button variant="secondary" className="w-full">
                    Вторичная кнопка
                  </Button>
                  <Button variant="outline" className="w-full">
                    Контурная кнопка
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Настройки применяются сразу на этой странице. После сохранения
                они будут подтягиваться при загрузке сайта.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
