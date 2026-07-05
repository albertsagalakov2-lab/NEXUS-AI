"use client"

import {
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
  FileImage,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
  Upload,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  status: string
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

const EXAMPLES = [
  {
    title: "Киберпанк-город",
    prompt: "Ночной киберпанк-город, мокрый асфальт, неоновые вывески, кинематографичный свет",
    className: "from-fuchsia-500/25 via-violet-500/10 to-cyan-400/20",
  },
  {
    title: "Космический пейзаж",
    prompt: "Астронавт на красной планете, огромная луна, реалистичная фотография, мягкий свет",
    className: "from-orange-400/20 via-rose-500/10 to-violet-500/20",
  },
  {
    title: "Уютная комната",
    prompt: "Уютная современная комната с растениями, утренний солнечный свет, интерьерная фотография",
    className: "from-amber-300/20 via-emerald-400/10 to-cyan-400/20",
  },
  {
    title: "Портрет героя",
    prompt: "Портрет фантастического героя, драматичный фиолетово-синий свет, высокая детализация",
    className: "from-violet-500/25 via-blue-500/10 to-fuchsia-500/20",
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
  const [isGenerating, setIsGenerating] = useState(false)
  const [deletingId, setDeletingId] = useState("")
  const [error, setError] = useState("")
  const [modelDialogOpen, setModelDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  const desktopFileRef = useRef<HTMLInputElement | null>(null)
  const libraryFileRef = useRef<HTMLInputElement | null>(null)
  const cameraFileRef = useRef<HTMLInputElement | null>(null)
  const genericFileRef = useRef<HTMLInputElement | null>(null)

  const selectedModel = useMemo(() => getModel(modelId), [modelId])

  useEffect(() => {
    if (!referenceFile) {
      setPreviewUrl("")
      return
    }

    const url = URL.createObjectURL(referenceFile)
    setPreviewUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [referenceFile])

  const loadImages = async () => {
    try {
      setError("")
      const data = await fetchJson("/api/images", { cache: "no-store" })
      setImages(data.images || [])
    } catch (loadError) {
      console.error("Load images error:", loadError)
      setError("Не получилось загрузить историю изображений.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadImages()
  }, [])

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
    if (!prompt.trim() || isGenerating) return

    setIsGenerating(true)
    setError("")

    try {
      const body = new FormData()
      body.append("prompt", prompt.trim())
      body.append("model", modelId)
      body.append("aspect_ratio", aspectRatio)
      body.append("image_size", imageSize)
      if (referenceFile) {
        const uploadFile = referenceFile.type.startsWith("video/")
          ? await videoFileToFrame(referenceFile)
          : referenceFile
        body.append("file", uploadFile)
      }

      const data = await fetchJson("/api/images", {
        method: "POST",
        body,
      })

      setImages((current) => [data.image as ImageGeneration, ...current])
      setPrompt("")
      setReferenceFile(null)
    } catch (generateError) {
      console.error("Generate image error:", generateError)
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Не получилось создать изображение."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return
    if (!window.confirm("Удалить это изображение?")) return

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

  return (
    <div className="min-h-screen overflow-x-hidden px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <input
        ref={desktopFileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={libraryFileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraFileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={genericFileRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mx-auto w-full max-w-5xl">
        <section className="relative flex min-h-[calc(100svh-150px)] flex-col justify-center py-8 lg:min-h-[640px] lg:py-12">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(91,75,255,0.10),transparent_68%)] blur-2xl" />

          <div className="relative mx-auto w-full max-w-3xl">
            <div className="mb-8 text-center sm:mb-10">
              <div className="mb-5 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-violet-300 shadow-[0_0_40px_rgba(124,58,237,0.14)]">
                  <ImageIcon className="h-7 w-7" />
                </span>
              </div>

              <h1 className="text-balance text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                Начните создавать с{" "}
                <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  {selectedModel.label}
                </span>
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-slate-400 sm:text-base">
                Опишите сцену, персонажа, настроение или стиль — и наблюдайте,
                как это оживает.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="rounded-[28px] border border-white/[0.11] bg-[#090d17]/90 p-3 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-4">
              <Textarea
                value={prompt}
                onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                  setPrompt(event.target.value)
                }
                onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    handleGenerate()
                  }
                }}
                placeholder="Опишите изображение..."
                className="min-h-[112px] resize-none border-0 bg-transparent px-2 py-2 text-base text-white shadow-none placeholder:text-slate-600 focus-visible:ring-0 sm:min-h-[130px]"
              />

              {referenceFile && (
                <div className="mx-1 mb-3 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2.5">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-black/30">
                    {referenceFile.type.startsWith("image/") && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Предпросмотр"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-blue-300">
                        <FileVideo className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">
                      {referenceFile.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {referenceFile.type.startsWith("video/")
                        ? "Видео-референс · используем кадр из видео"
                        : "Изображение-референс"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setReferenceFile(null)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Убрать файл"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => desktopFileRef.current?.click()}
                    className="h-11 w-11 rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                    title="Прикрепить фото или видео"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                </div>

                <div className="sm:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="start"
                      sideOffset={10}
                      className="w-56 rounded-2xl border-white/[0.09] bg-[#11141b] p-2 text-slate-100 shadow-2xl"
                    >
                      <DropdownMenuItem
                        onSelect={() => libraryFileRef.current?.click()}
                        className="rounded-xl px-3 py-3 focus:bg-white/[0.07] focus:text-white"
                      >
                        <FileImage className="h-5 w-5 text-blue-400" />
                        Медиатека
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => cameraFileRef.current?.click()}
                        className="rounded-xl px-3 py-3 focus:bg-white/[0.07] focus:text-white"
                      >
                        <ImageIcon className="h-5 w-5 text-blue-400" />
                        Сделать снимок
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => genericFileRef.current?.click()}
                        className="rounded-xl px-3 py-3 focus:bg-white/[0.07] focus:text-white"
                      >
                        <Upload className="h-5 w-5 text-blue-400" />
                        Выбрать файл
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <button
                  type="button"
                  onClick={() => setModelDialogOpen(true)}
                  className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.035] px-3 text-sm text-slate-200 transition hover:bg-white/[0.07]"
                >
                  <ModelIcon model={selectedModel} className="h-7 w-7 rounded-lg text-base" />
                  <span className="max-w-[150px] truncate font-medium sm:max-w-none">
                    {selectedModel.label}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                </button>

                <div className="ml-auto hidden items-center gap-2 md:flex">
                  <Select value={aspectRatio} onValueChange={setAspectRatio}>
                    <SelectTrigger className="h-11 w-[94px] rounded-xl border-white/[0.07] bg-white/[0.035] text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASPECT_RATIOS.map((ratio) => (
                        <SelectItem key={ratio} value={ratio}>
                          {ratio}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={imageSize} onValueChange={setImageSize}>
                    <SelectTrigger className="h-11 w-[82px] rounded-xl border-white/[0.07] bg-white/[0.035] text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMAGE_SIZES.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsDialogOpen(true)}
                  className="ml-auto h-11 w-11 rounded-xl border border-white/[0.07] bg-white/[0.035] text-slate-300 hover:bg-white/[0.07] hover:text-white md:hidden"
                >
                  <Settings2 className="h-5 w-5" />
                </Button>

                <Button
                  type="button"
                  size="icon"
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isGenerating}
                  className="h-11 w-11 shrink-0 rounded-full bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 text-white shadow-[0_0_28px_rgba(124,58,237,0.28)] hover:opacity-90 disabled:opacity-35"
                  aria-label="Создать изображение"
                >
                  {isGenerating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-600">
              Фото или короткое видео до 4 МБ · Enter для запуска
            </p>
          </div>
        </section>

        <section className="pb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">
              Примеры запросов
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {EXAMPLES.map((example) => (
              <button
                key={example.title}
                type="button"
                onClick={() => setPrompt(example.prompt)}
                className={cn(
                  "group min-h-32 overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-br p-4 text-left transition hover:-translate-y-0.5 hover:border-violet-400/30",
                  example.className
                )}
              >
                <ImageIcon className="mb-7 h-5 w-5 text-blue-300" />
                <p className="text-sm font-medium text-white">
                  {example.title}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                  {example.prompt}
                </p>
              </button>
            ))}
          </div>
        </section>

        <section className="pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-300">
              Ваши генерации
            </h2>
            <span className="text-xs text-slate-600">
              {images.length} результатов
            </span>
          </div>

          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.02]">
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            </div>
          ) : images.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.015] text-center">
              <ImageIcon className="mb-3 h-8 w-8 text-slate-700" />
              <p className="text-sm font-medium text-slate-300">
                Здесь появятся изображения
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Выберите модель и запустите первую генерацию
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {images.map((image) => {
                const imageModel = getModel(image.style)
                return (
                  <article
                    key={image.id}
                    className="group overflow-hidden rounded-2xl border border-white/[0.075] bg-white/[0.025]"
                  >
                    <div className="relative aspect-square overflow-hidden bg-[#0b0f18]">
                      {image.image_url ? (
                        <img
                          src={image.image_url}
                          alt={image.prompt}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-slate-700" />
                        </div>
                      )}

                      <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                        {image.image_url && (
                          <a
                            href={image.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-white backdrop-blur-md hover:bg-black/75"
                            aria-label="Открыть изображение"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(image.id)}
                          disabled={deletingId === image.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-white backdrop-blur-md hover:bg-red-500/70 disabled:opacity-50"
                          aria-label="Удалить изображение"
                        >
                          {deletingId === image.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="p-3">
                      <p className="line-clamp-2 text-xs leading-5 text-slate-300">
                        {image.prompt}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-600">
                        <span className="truncate">{imageModel.label}</span>
                        <span>{formatDate(image.created_at)}</span>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
        <DialogContent className="border-white/[0.09] bg-[#11141b] p-0 text-white sm:max-w-lg max-sm:bottom-0 max-sm:left-0 max-sm:top-auto max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-[28px]">
          <DialogHeader className="border-b border-white/[0.08] px-5 py-5 text-left">
            <DialogTitle className="text-xl">Выберите модель</DialogTitle>
            <DialogDescription className="sr-only">
              Выбор модели генерации изображений
            </DialogDescription>
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
                    <p className="mt-0.5 text-sm text-slate-500">
                      {model.description}
                    </p>
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
            <DialogDescription>
              Выберите формат и качество результата.
            </DialogDescription>
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
              <p className="mb-2 text-sm font-medium text-slate-200">
                Разрешение
              </p>
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
