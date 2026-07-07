export const runtime = "nodejs"

type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } }

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string | ChatContentPart[]
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

function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return []

  return value.filter((message): message is ChatMessage => {
    if (!message || typeof message !== "object") return false

    const role = (message as { role?: unknown }).role
    const content = (message as { content?: unknown }).content

    const validRole =
      role === "system" || role === "user" || role === "assistant"
    const validContent = typeof content === "string" || Array.isArray(content)

    return validRole && validContent
  })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const messages = normalizeMessages(body.messages)

    if (messages.length === 0) {
      return Response.json(
        { error: "Сообщения не переданы" },
        { status: 400 }
      )
    }

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
      return Response.json(
        {
          error:
            "В Vercel не настроен OPENROUTER_API_KEY или OPENAI_API_KEY",
        },
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
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("OpenRouter error:", {
        status: response.status,
        model,
        hasImages,
        errorText,
      })

      return Response.json(
        {
          error: errorText,
          model,
          hasImages,
        },
        { status: response.status }
      )
    }

    const data = await response.json()

    return Response.json({
      message: data.choices?.[0]?.message?.content || "",
      model,
      hasImages,
    })
  } catch (error) {
    console.error("Chat API error:", error)

    return Response.json(
      { error: "Ошибка Chat API" },
      { status: 500 }
    )
  }
}
