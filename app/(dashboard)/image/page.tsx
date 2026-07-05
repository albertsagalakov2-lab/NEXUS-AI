"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react"
import {
  ArrowUp,
  BarChart3,
  Check,
  ChevronDown,
  Download,
  FileVideo,
  Image as ImageIcon,
  Paperclip,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type ImageModelId =
  | "nano-banana-pro"
  | "seedream-4-5"
  | "gpt-image-2"

type ImageGeneration = {
  id: string
  user_id: string
  prompt: string
  style: string | null
  aspect_ratio: string | null
  image_url: string | null
  status: "processing" | "completed" | "failed" | string
  created_at: string
}

type ModelOption = {
  id: ImageModelId
  label: string
  description: string
  icon: "banana" | "seedream" | "gpt"
}

const MODELS: ModelOption[] = [
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    description: "Быстрая генерация до 4K",
    icon: "banana",
  },
  {
    id: "seedream-4-5",
    label: "Seedream 4.5",
    description: "Улучшенная версия",
    icon: "seedream",
  },
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    description: "Нового поколения, 1K/2K/4K",
    icon: "gpt",
  },
]

const ASPECT_RATIOS = ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"]
const IMAGE_SIZES = ["1K", "2K", "4K"]
const MAX_FILE_SIZE = 4 * 1024 * 1024

function ModelIcon({ model, className }: { model: ModelOption; className?: string }) {
  if (model.icon === "banana") {
    return (
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400/10 text-2xl",
          className
        )}
        aria-hidden="true"
      >
        🍌
      </span>
    )
  }

  if (model.icon === "seedream") {
    return (
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-white",
          className
        )}
      >
        <BarChart3 className="h-5 w-5" />
      </span>
    )
  }

  return (
    <span
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300",
        className
      )}
    >
      <Sparkles className="h-5 w-5" />
    </span>
  )
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5", className)}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.2"
        opacity="0.18"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="0.85s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}

function getModel(modelId?: string | null) {
  return MODELS.find((model) => model.id === modelId) || MODELS[2]
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

function isPublicImageUrl(value?: string | null) {
  return Boolean(value && /^https?:\/\//i.test(value))
}

async function fetchJson(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || "Request failed")
  }

  return data
}

async function videoFileToFrame(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const video = document.createElement("video")
    video.src = objectUrl
    video.muted = true
    video.playsInline = true
    video.preload = "metadata"

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => {
        const safeDuration = Number.isFinite(video.duration) ? video.duration : 0
        video.currentTime = Math.min(Math.max(safeDuration * 0.15, 0.05), 1)
      }
      video.onseeked = () => resolve()
      video.onerror = () => reject(new Error("Не получилось прочитать видео"))
    })

    const maxSide = 1600
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight))
    const width = Math.max(1, Math.round(video.videoWidth * scale))
    const height = Math.max(1, Math.round(video.videoHeight * scale))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext("2d")
    if (!context) throw new Error("Не получилось подготовить кадр видео")
    context.drawImage(video, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Не получилось подготовить кадр видео")),
        "image/jpeg",
        0.9
      )
    })

    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-frame.jpg`, {
      type: "image/jpeg",
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export default function ImageGenerationPage() {
  const [prompt, setPrompt] = useState("")
  const [modelId, setModelId] = useState<ImageModelId>("gpt-image-2")
  const [aspectRatio, setAspectRatio] = useState("1:1")
  const [imageSize, setImageSize] = useState("1K")
  const [referenceFile, setReferenceFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  const [images, setImages] = useState<ImageGeneration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [error, setError] = useState("")
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const requestInFlightRef = useRef(false)

  const selectedModel = useMemo(() => getModel(modelId), [modelId])
  const pendingCount = useMemo(
    () => images.filter((image) => image.status === "processing").length,
    [images]
  )

  useEffect(() => {
    if (!referenceFile) {
      setPreviewUrl("")
      return
    }

    const url = URL.createObjectURL(referenceFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [referenceFile])

  const loadImages = useCallback(async (silent = false) => {
    if (requestInFlightRef.current) return
    requestInFlightRef.current = true

    try {
      if (!silent) setError("")
      const data = await fetchJson("/api/images", { cache: "no-store" })
      setImages(data.images || [])
    } catch (loadError) {
      console.error("Load images error:", loadError)
      if (!silent) setError("Не получилось загрузить историю изображений.")
    } finally {
      requestInFlightRef.current = false
      if (!silent) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadImages(false)
  }, [loadImages])

  useEffect(() => {
    if (pendingCount === 0) return

    const timer = window.setInterval(() => {
      loadImages(true)
    }, 3500)

    return () => window.clearInterval(timer)
  }, [loadImages, pendingCount])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Можно прикрепить только фотографию или видео.")
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Максимальный размер файла — 4 МБ.")
      return
    }

    setError("")
    setReferenceFile(file)
  }

  const handleGenerate = async () => {
    const currentPrompt = prompt.trim()
    if (!currentPrompt || isSubmitting) return

    const currentFile = referenceFile
    setIsSubmitting(true)
    setError("")

    try {
      const body = new FormData()
      body.append("prompt", currentPrompt)
      body.append("model", modelId)
      body.append("aspect_ratio", aspectRatio)
      body.append("image_size", imageSize)

      if (currentFile) {
        const uploadFile = currentFile.type.startsWith("video/")
          ? await videoFileToFrame(currentFile)
          : currentFile
        body.append("file", uploadFile)
      }

      const data = await fetchJson("/api/images", {
        method: "POST",
        body,
      })

      const created = data.image as ImageGeneration
      setImages((current) => [created, ...current.filter((item) => item.id !== created.id)])
      setPrompt("")
      setReferenceFile(null)
    } catch (generateError) {
      console.error("Generate image error:", generateError)
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Не получилось запустить генерацию изображения."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return
    if (!window.confirm("Удалить эту генерацию?")) return

    setDeletingId(id)
    setError("")

    try {
      await fetchJson(`/api/images/${id}`, { method: "DELETE" })
      setImages((current) => current.filter((image) => image.id !== id))
    } catch (deleteError) {
      console.error("Delete image error:", deleteError)
      setError("Не получилось удалить изображение.")
    } finally {
      setDeletingId("")
    }
  }

  const composer = (
    <div className="w-full overflow-hidden rounded-[22px] border border-white/[0.09] bg-[#0a0f1d]/94 shadow-[0_18px_55px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="px-3.5 pt-3.5 sm:px-4 sm:pt-4">
        <Textarea
          value={prompt}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setPrompt(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault()
              handleGenerate()
            }
          }}
          placeholder="Опишите изображение..."
          className="min-h-[76px] resize-none border-0 bg-transparent px-1.5 py-1.5 text-[15px] leading-6 text-white shadow-none placeholder:text-slate-600 focus-visible:ring-0 sm:min-h-[88px] sm:text-base"
        />

        {referenceFile && (
          <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.03] p-2">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black/30">
              {referenceFile.type.startsWith("image/") && previewUrl ? (
                <img src={previewUrl} alt="Предпросмотр" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-blue-300">
                  <FileVideo className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-slate-200 sm:text-sm">{referenceFile.name}</p>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {referenceFile.type.startsWith("video/")
                  ? "Видео-референс · используем кадр"
                  : "Изображение-референс"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReferenceFile(null)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Убрать файл"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-white/[0.055] bg-black/[0.06] px-2.5 py-2.5 sm:px-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="h-9 w-9 shrink-0 rounded-[11px] border border-white/[0.07] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white"
            title="Прикрепить фото или видео"
          >
            <Paperclip className="hidden h-4 w-4 sm:block" />
            <Plus className="h-4 w-4 sm:hidden" />
          </Button>

          <button
            type="button"
            onClick={() => setModelDialogOpen(true)}
            className="flex h-9 min-w-0 flex-1 items-center gap-1.5 rounded-[11px] border border-white/[0.07] bg-white/[0.03] px-2.5 text-xs text-slate-200 transition hover:bg-white/[0.07] sm:w-[188px] sm:flex-none sm:text-sm"
          >
            <ModelIcon model={selectedModel} className="h-6 w-6 rounded-md text-sm" />
            <span className="min-w-0 flex-1 truncate text-left font-medium">{selectedModel.label}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          </button>

          <div className="ml-auto hidden items-center gap-1.5 md:flex">
            <Select value={aspectRatio} onValueChange={setAspectRatio}>
              <SelectTrigger className="h-9 w-[78px] rounded-[11px] border-white/[0.07] bg-white/[0.03] px-2.5 text-xs text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>{ratio}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={imageSize} onValueChange={setImageSize}>
              <SelectTrigger className="h-9 w-[68px] rounded-[11px] border-white/[0.07] bg-white/[0.03] px-2.5 text-xs text-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSettingsDialogOpen(true)}
            className="h-9 w-9 shrink-0 rounded-[11px] border border-white/[0.07] bg-white/[0.03] text-slate-300 hover:bg-white/[0.07] hover:text-white md:hidden"
            aria-label="Параметры"
          >
            <Settings2 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            size="icon"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isSubmitting}
            className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_0_22px_rgba(124,58,237,0.24)] hover:opacity-90 disabled:opacity-35"
            aria-label="Создать изображение"
          >
            {isSubmitting ? <LoadingSpinner className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="relative min-h-[calc(100dvh-64px)] overflow-x-hidden bg-[#040718] px-3 pb-28 pt-4 sm:px-5 lg:min-h-screen lg:px-7 lg:pb-10 lg:pt-7">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-10%,rgba(74,67,255,0.10),transparent_34rem),radial-gradient(circle_at_85%_12%,rgba(14,165,233,0.06),transparent_28rem)]" />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <main className="mx-auto w-full max-w-[1080px]">
        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mx-auto w-full max-w-[820px] pt-1 sm:pt-3">
          <div className="mb-5 text-center sm:mb-6">
            <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
              Создание изображений
            </h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Опишите идею, выберите модель и получите результат. Незавершённые задачи сохраняются даже после обновления страницы.
            </p>
          </div>
          {composer}
          <p className="mt-3 text-center text-[11px] text-slate-600">
            Фото или короткое видео до 4 МБ · Enter для запуска
          </p>
        </section>

        <section className="mx-auto mt-9 w-full max-w-[1000px] sm:mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white sm:text-xl">История генераций</h2>
              <p className="mt-1 text-sm text-slate-500">
                {pendingCount > 0
                  ? `В процессе: ${pendingCount}. Статус обновляется автоматически.`
                  : "Все созданные изображения хранятся здесь."}
              </p>
            </div>
            {images.length > 0 && (
              <span className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-xs text-slate-400">
                {images.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-[26px] border border-white/[0.07] bg-white/[0.02]">
              <LoadingSpinner className="h-6 w-6 text-violet-400" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex min-h-[250px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/[0.10] bg-white/[0.018] px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] text-slate-500">
                <ImageIcon className="h-6 w-6" />
              </span>
              <p className="mt-4 font-medium text-slate-300">История пока пустая</p>
              <p className="mt-1 max-w-sm text-sm leading-6 text-slate-600">
                После запуска первая задача сразу появится здесь и не исчезнет при обновлении страницы.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {images.map((image) => {
                const imageModel = getModel(image.style)
                const completed = image.status === "completed" && isPublicImageUrl(image.image_url)
                const processing = image.status === "processing"
                const failed = image.status === "failed"

                return (
                  <article
                    key={image.id}
                    className="min-w-0 overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#090e1b]/92 shadow-[0_14px_45px_rgba(0,0,0,0.24)]"
                  >
                    <div className="flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-3">
                      <ModelIcon model={imageModel} className="h-7 w-7 rounded-lg text-sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{imageModel.label}</p>
                        <p className="mt-0.5 text-[11px] text-slate-600">{formatDate(image.created_at)}</p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium",
                          processing && "bg-violet-500/10 text-violet-300",
                          completed && "bg-emerald-500/10 text-emerald-300",
                          failed && "bg-red-500/10 text-red-300"
                        )}
                      >
                        {processing ? "Создаётся" : completed ? "Готово" : "Ошибка"}
                      </span>
                    </div>

                    <div className="border-b border-white/[0.055] px-3.5 py-2.5">
                      <p className="line-clamp-3 text-sm leading-6 text-slate-300">{image.prompt}</p>
                    </div>

                    <div className="relative flex min-h-[220px] items-center justify-center bg-[#060a14] p-2.5 sm:min-h-[250px]">
                      {completed ? (
                        <img
                          src={image.image_url || ""}
                          alt={image.prompt}
                          className="max-h-[380px] w-full rounded-[15px] object-contain"
                        />
                      ) : processing ? (
                        <div className="flex w-full flex-col items-center justify-center">
                          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.06]">
                            <LoadingSpinner className="h-6 w-6 text-violet-400" />
                            <span className="pointer-events-none absolute inset-0 animate-pulse rounded-2xl shadow-[0_0_30px_rgba(124,58,237,0.16)]" />
                          </div>
                          <p className="mt-4 text-sm font-medium text-slate-300">Генерация продолжается</p>
                          <p className="mt-1 text-xs text-slate-600">Можно обновить страницу или вернуться позже</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center">
                          <ImageIcon className="h-8 w-8 text-red-300/60" />
                          <p className="mt-3 text-sm text-slate-400">Не удалось создать изображение</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <p className="min-w-0 flex-1 truncate text-xs text-slate-600">
                        {image.aspect_ratio || "1:1"}
                      </p>
                      <div className="flex gap-2">
                        {completed && (
                          <a
                            href={image.image_url || "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                            aria-label="Скачать изображение"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(image.id)}
                          disabled={deletingId === image.id}
                          className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:border-red-400/25 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                          aria-label="Удалить генерацию"
                        >
                          {deletingId === image.id ? (
                            <LoadingSpinner className="h-3.5 w-3.5" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="border-white/[0.09] bg-[#11141b] p-0 text-white sm:max-w-lg max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-[28px]">
          <DialogHeader className="border-b border-white/[0.08] px-5 py-5 text-left">
            <DialogTitle className="text-xl">Выберите модель</DialogTitle>
            <DialogDescription className="sr-only">Выбор модели генерации изображений</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 p-3 pb-6 sm:p-4">
            {MODELS.map((model) => {
              const selected = model.id === modelId
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    setModelId(model.id)
                    setModelDialogOpen(false)
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                    selected
                      ? "border-violet-400/45 bg-white/[0.075]"
                      : "border-white/[0.07] bg-white/[0.025] hover:bg-white/[0.055]"
                  )}
                >
                  <ModelIcon model={model} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">{model.label}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{model.description}</p>
                  </div>
                  {selected && <Check className="h-5 w-5 text-white" />}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="border-white/[0.09] bg-[#11141b] text-white sm:max-w-md max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-[28px]">
          <DialogHeader className="text-left">
            <DialogTitle>Параметры изображения</DialogTitle>
            <DialogDescription>Выберите формат и качество результата.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-200">Формат</p>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <button
                    key={ratio}
                    type="button"
                    onClick={() => setAspectRatio(ratio)}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-sm transition",
                      aspectRatio === ratio
                        ? "border-violet-400/45 bg-violet-500/10 text-violet-200"
                        : "border-white/[0.07] bg-white/[0.025] text-slate-400"
                    )}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-200">Разрешение</p>
              <div className="grid grid-cols-3 gap-2">
                {IMAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setImageSize(size)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-sm transition",
                      imageSize === size
                        ? "border-violet-400/45 bg-violet-500/10 text-violet-200"
                        : "border-white/[0.07] bg-white/[0.025] text-slate-400"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <Button
              type="button"
              onClick={() => setSettingsDialogOpen(false)}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-600"
            >
              Готово
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
