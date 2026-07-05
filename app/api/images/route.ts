import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import {
  createImageTask,
  getImageTaskStatus,
  type ImageModelId,
  type ReferenceFile,
} from "@/lib/image-generation/providers"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

const ALLOWED_MODELS: ImageModelId[] = [
  "nano-banana-pro",
  "seedream-4-5",
  "gpt-image-2",
]

const ALLOWED_ASPECT_RATIOS = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
]

const ALLOWED_IMAGE_SIZES = ["1K", "2K", "4K"] as const
const MAX_REFERENCE_BYTES = 4 * 1024 * 1024
const TASK_PREFIX = "kie-task:"

type ImageRow = {
  id: string
  user_id: string
  prompt: string
  style: string | null
  aspect_ratio: string | null
  image_url: string | null
  status: string
  created_at: string
}

function isAllowedReferenceType(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/")
}

function getExtension(mimeType: string) {
  if (mimeType.includes("jpeg")) return "jpg"
  if (mimeType.includes("webp")) return "webp"
  if (mimeType.includes("gif")) return "gif"
  return "png"
}

function getTaskId(imageUrl: string | null) {
  if (!imageUrl?.startsWith(TASK_PREFIX)) return null
  return imageUrl.slice(TASK_PREFIX.length)
}

async function normalizeGeneratedImage(result: {
  bytes?: Buffer
  mimeType?: string
  url?: string
}) {
  if (result.bytes) {
    return {
      bytes: result.bytes,
      mimeType: result.mimeType || "image/png",
    }
  }

  if (!result.url) {
    throw new Error("Провайдер не вернул изображение")
  }

  const response = await fetch(result.url, { cache: "no-store" })
  if (!response.ok) {
    return { url: result.url }
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  const mimeType = response.headers.get("content-type") || "image/png"

  return { bytes, mimeType }
}

async function persistGeneratedImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  result: { bytes?: Buffer; mimeType?: string; url?: string }
) {
  const sourceUrl = result.url
  const normalized = await normalizeGeneratedImage(result)

  if ("url" in normalized && normalized.url) {
    return normalized.url
  }

  const bytes = normalized.bytes
  const mimeType = normalized.mimeType || "image/png"

  if (!bytes) {
    if (sourceUrl) return sourceUrl
    throw new Error("Пустой ответ изображения")
  }

  const bucket = process.env.IMAGE_STORAGE_BUCKET || "generated-images"
  const path = `${userId}/${Date.now()}-${randomUUID()}.${getExtension(mimeType)}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, {
      contentType: mimeType,
      cacheControl: "31536000",
      upsert: false,
    })

  if (!uploadError) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    if (data.publicUrl) return data.publicUrl
  }

  // Если Storage временно недоступен, показываем ссылку Kie.ai.
  if (sourceUrl) return sourceUrl

  return `data:${mimeType};base64,${bytes.toString("base64")}`
}

async function refreshPendingRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  rows: ImageRow[]
) {
  const pending = rows
    .filter((row) => row.status === "processing" && getTaskId(row.image_url))
    .slice(0, 6)

  await Promise.allSettled(
    pending.map(async (row) => {
      const taskId = getTaskId(row.image_url)
      if (!taskId) return

      try {
        const task = await getImageTaskStatus(taskId)

        if (task.status === "processing") return

        if (task.status === "failed") {
          await supabase
            .from("image_generations")
            .update({ status: "failed", image_url: null })
            .eq("id", row.id)
            .eq("user_id", userId)
            .eq("status", "processing")
          return
        }

        const permanentUrl = await persistGeneratedImage(supabase, userId, {
          url: task.url,
        })

        await supabase
          .from("image_generations")
          .update({ status: "completed", image_url: permanentUrl })
          .eq("id", row.id)
          .eq("user_id", userId)
          .eq("status", "processing")
      } catch (error) {
        // Сетевые ошибки не помечаем как окончательный сбой: следующий опрос
        // повторит проверку задачи Kie.ai.
        console.error(`Image task refresh failed for ${row.id}:`, error)
      }
    })
  )
}

async function selectImages(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  return supabase
    .from("image_generations")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const firstQuery = await selectImages(supabase, user.id)
  if (firstQuery.error) {
    return NextResponse.json({ error: firstQuery.error.message }, { status: 500 })
  }

  const rows = (firstQuery.data || []) as ImageRow[]
  await refreshPendingRows(supabase, user.id, rows)

  const hasPending = rows.some((row) => row.status === "processing")
  if (!hasPending) {
    return NextResponse.json({ images: rows })
  }

  const refreshedQuery = await selectImages(supabase, user.id)
  if (refreshedQuery.error) {
    return NextResponse.json(
      { error: refreshedQuery.error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ images: refreshedQuery.data || [] })
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentType = request.headers.get("content-type") || ""
    let prompt = ""
    let model = "gpt-image-2" as ImageModelId
    let aspectRatio = "1:1"
    let imageSize: (typeof ALLOWED_IMAGE_SIZES)[number] = "1K"
    let reference: ReferenceFile | null = null

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      prompt = String(form.get("prompt") || "").trim()
      model = String(form.get("model") || "gpt-image-2") as ImageModelId
      aspectRatio = String(form.get("aspect_ratio") || "1:1")
      imageSize = String(form.get("image_size") || "1K") as typeof imageSize

      const file = form.get("file")
      if (file instanceof File && file.size > 0) {
        if (!isAllowedReferenceType(file.type)) {
          return NextResponse.json(
            { error: "Можно прикрепить только изображение или видео" },
            { status: 400 }
          )
        }

        if (file.size > MAX_REFERENCE_BYTES) {
          return NextResponse.json(
            { error: "Файл слишком большой. Максимум 4 МБ." },
            { status: 400 }
          )
        }

        reference = {
          bytes: Buffer.from(await file.arrayBuffer()),
          mimeType: file.type,
          name: file.name || "reference",
        }
      }
    } else {
      const body = await request.json().catch(() => ({}))
      prompt = String(body.prompt || "").trim()
      model = String(body.model || "gpt-image-2") as ImageModelId
      aspectRatio = String(body.aspect_ratio || "1:1")
      imageSize = String(body.image_size || "1K") as typeof imageSize
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Введите описание изображения" },
        { status: 400 }
      )
    }

    if (!ALLOWED_MODELS.includes(model)) {
      return NextResponse.json(
        { error: "Неизвестная модель генерации" },
        { status: 400 }
      )
    }

    if (!ALLOWED_ASPECT_RATIOS.includes(aspectRatio)) {
      aspectRatio = "1:1"
    }

    if (!ALLOWED_IMAGE_SIZES.includes(imageSize)) {
      imageSize = "1K"
    }

    const task = await createImageTask({
      prompt,
      model,
      aspectRatio,
      imageSize,
      reference,
    })

    const { data, error } = await supabase
      .from("image_generations")
      .insert({
        user_id: user.id,
        prompt,
        style: model,
        aspect_ratio: aspectRatio,
        image_url: `${TASK_PREFIX}${task.taskId}`,
        status: "processing",
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      image: data,
      task_id: task.taskId,
      provider_model: task.providerModel,
    })
  } catch (error) {
    console.error("Image generation error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не получилось запустить генерацию изображения",
      },
      { status: 500 }
    )
  }
}
