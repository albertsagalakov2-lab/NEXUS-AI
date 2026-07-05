import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"

import {
  generateImage,
  type ImageModelId,
  type ReferenceFile,
} from "@/lib/image-generation/providers"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 300

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

function isAllowedReferenceType(mimeType: string) {
  return mimeType.startsWith("image/") || mimeType.startsWith("video/")
}

function getExtension(mimeType: string) {
  if (mimeType.includes("jpeg")) return "jpg"
  if (mimeType.includes("webp")) return "webp"
  if (mimeType.includes("gif")) return "gif"
  return "png"
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

  // Kie.ai хранит результаты временно. Создайте публичный bucket
  // generated-images в Supabase, чтобы история не теряла изображения.
  if (sourceUrl) return sourceUrl

  return `data:${mimeType};base64,${bytes.toString("base64")}`
}

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data, error } = await supabase
    .from("image_generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ images: data || [] })
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
            { error: "Файл слишком большой. Максимум 4 МБ для Vercel-запроса." },
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

    const generated = await generateImage({
      prompt,
      model,
      aspectRatio,
      imageSize,
      reference,
    })

    const imageUrl = await persistGeneratedImage(supabase, user.id, generated)

    const { data, error } = await supabase
      .from("image_generations")
      .insert({
        user_id: user.id,
        prompt,
        style: model,
        aspect_ratio: aspectRatio,
        image_url: imageUrl,
        status: "completed",
      })
      .select("*")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      image: data,
      provider_model: generated.providerModel,
    })
  } catch (error) {
    console.error("Image generation error:", error)

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не получилось создать изображение",
      },
      { status: 500 }
    )
  }
}
