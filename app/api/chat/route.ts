import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

type ChatMessage = {
  role: "user" | "assistant"
  content: string | ChatContentPart[]
}

type MessageValidationResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: string }

const MAX_MESSAGES = 30
const MAX_MESSAGE_TEXT_LENGTH = 4_000
const MAX_TOTAL_TEXT_LENGTH = 12_000
const MAX_IMAGES = 3
const MAX_IMAGE_DATA_URL_LENGTH = 7 * 1024 * 1024
const MAX_REQUEST_BYTES = 24 * 1024 * 1024
const PROVIDER_TIMEOUT_MS = 55_000

function validateImageUrl(value: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    return { ok: false as const, error: "Некорректное изображение." }
  }

  if (value.startsWith("data:")) {
    if (value.length > MAX_IMAGE_DATA_URL_LENGTH) {
      return { ok: false as const, error: "Изображение слишком большое." }
    }

    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(value)) {
      return { ok: false as const, error: "Некорректное изображение." }
    }

    return { ok: true as const }
  }

  try {
    const url = new URL(value)
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return { ok: false as const, error: "Некорректное изображение." }
    }
  } catch {
    return { ok: false as const, error: "Некорректное изображение." }
  }

  return { ok: true as const }
}

function messageContainsImage(message: unknown): boolean {
  if (!message || typeof message !== "object") return false

  const content = (message as { content?: unknown }).content
  if (!Array.isArray(content)) return false

  return content.some((part) => {
    if (!part || typeof part !== "object") return false
    return (part as { type?: unknown }).type === "image_url"
  })
}

function validateMessages(value: unknown): MessageValidationResult {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "Добавьте хотя бы одно сообщение." }
  }

  if (value.length > MAX_MESSAGES) {
    return { ok: false, error: "Можно отправить не более 30 сообщений." }
  }

  const messages: ChatMessage[] = []
  let totalTextLength = 0
  let imageCount = 0

  for (const valueItem of value) {
    if (!valueItem || typeof valueItem !== "object" || Array.isArray(valueItem)) {
      return { ok: false, error: "Некорректный формат сообщений." }
    }

    const role = (valueItem as { role?: unknown }).role
    const content = (valueItem as { content?: unknown }).content

    if (role !== "user" && role !== "assistant") {
      return {
        ok: false,
        error: "Разрешены только роли user и assistant.",
      }
    }

    let messageTextLength = 0
    let hasContent = false

    if (typeof content === "string") {
      messageTextLength = content.length
      hasContent = content.trim().length > 0
    } else if (Array.isArray(content) && content.length > 0) {
      for (const part of content) {
        if (!part || typeof part !== "object" || Array.isArray(part)) {
          return { ok: false, error: "Некорректный формат сообщений." }
        }

        const partType = (part as { type?: unknown }).type

        if (partType === "text") {
          const text = (part as { text?: unknown }).text
          if (typeof text !== "string") {
            return { ok: false, error: "Некорректный формат сообщений." }
          }

          messageTextLength += text.length
          hasContent ||= text.trim().length > 0
          continue
        }

        if (partType === "image_url") {
          const imageUrl = (part as {
            image_url?: { url?: unknown }
          }).image_url?.url
          const imageValidation = validateImageUrl(imageUrl)

          if (!imageValidation.ok) {
            return imageValidation
          }

          imageCount += 1
          hasContent = true

          if (imageCount > MAX_IMAGES) {
            return {
              ok: false,
              error: "Можно прикрепить не более 3 изображений.",
            }
          }

          continue
        }

        return { ok: false, error: "Некорректный формат сообщений." }
      }
    } else {
      return { ok: false, error: "Некорректный формат сообщений." }
    }

    if (!hasContent) {
      return { ok: false, error: "Сообщение не может быть пустым." }
    }

    if (messageTextLength > MAX_MESSAGE_TEXT_LENGTH) {
      return {
        ok: false,
        error: "Одно сообщение не может превышать 4000 символов.",
      }
    }

    totalTextLength += messageTextLength
    if (totalTextLength > MAX_TOTAL_TEXT_LENGTH) {
      return {
        ok: false,
        error: "Общий объём текста не может превышать 12000 символов.",
      }
    }

    messages.push({ role, content: content as ChatMessage["content"] })
  }

  return { ok: true, messages }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("Chat API auth error:", {
        type: authError.name,
        message: authError.message,
      })

      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const contentLength = Number(req.headers.get("content-length") || 0)
    if (contentLength > MAX_REQUEST_BYTES) {
      return Response.json({ error: "Запрос слишком большой." }, { status: 400 })
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return Response.json(
        { error: "Некорректная структура запроса." },
        { status: 400 }
      )
    }

    const validation = validateMessages(
      (body as { messages?: unknown }).messages
    )

    if (!validation.ok) {
      return Response.json({ error: validation.error }, { status: 400 })
    }

    const messages = validation.messages

    const apiKey =
      process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY
    const baseUrl =
      process.env.OPENAI_API_BASE_URL || "https://openrouter.ai/api/v1"

    const hasImages = messages.some(messageContainsImage)
    const textModel = process.env.OPENAI_MODEL || "openai/gpt-4o-mini"
    const visionModel =
      process.env.OPENAI_VISION_MODEL || "openai/gpt-4o-mini"
    const model = hasImages ? visionModel : textModel

    if (!apiKey) {
      console.error("Chat API configuration error: provider key is missing")

      return Response.json(
        { error: "Не удалось обработать запрос. Попробуйте позже." },
        { status: 500 }
      )
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://neiropeiro.ai",
        "X-Title": "NeiroPeiro AI",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: hasImages
              ? "Ты русскоязычный мультимодальный AI-ассистент NeiroPeiro AI. В текущем запросе есть одно или несколько изображений. Внимательно проанализируй их и ответь по содержимому. Не говори, что не умеешь видеть изображения, если они переданы в запросе. Не называй себя GPT-3.5 и не выдумывай версию базовой модели."
              : "Ты русскоязычный AI-ассистент NeiroPeiro AI. Отвечай понятно, по делу и на русском языке. Не называй себя GPT-3.5 и не выдумывай версию базовой модели. Если пользователь явно попросит другой язык, можно ответить на другом языке.",
          },
          ...messages,
        ],
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    })

    if (!response.ok) {
      console.error("Chat provider request failed:", {
        status: response.status,
        statusText: response.statusText,
      })

      return Response.json(
        { error: "Не удалось обработать запрос. Попробуйте позже." },
        { status: response.status === 408 ? 504 : 502 }
      )
    }

    const data = await response.json()

    return Response.json({
      message: data.choices?.[0]?.message?.content || "",
      model,
      hasImages,
    })
  } catch (error) {
    const isTimeout =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")

    console.error("Chat API request failed:", {
      type: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    })

    return Response.json(
      { error: "Не удалось обработать запрос. Попробуйте позже." },
      { status: isTimeout ? 504 : 500 }
    )
  }
}
