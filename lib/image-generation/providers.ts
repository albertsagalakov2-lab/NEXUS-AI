import "server-only"

export type ImageModelId =
  | "nano-banana-pro"
  | "seedream-4-5"
  | "gpt-image-2"

export type ReferenceFile = {
  bytes: Buffer
  mimeType: string
  name: string
}

export type GenerateImageInput = {
  prompt: string
  model: ImageModelId
  aspectRatio: string
  imageSize: "1K" | "2K" | "4K"
  reference?: ReferenceFile | null
}

export type GeneratedImage = {
  url: string
  providerModel: string
}

type JsonObject = Record<string, unknown>

const MODEL_LABELS: Record<ImageModelId, string> = {
  "nano-banana-pro": "Nano Banana Pro",
  "seedream-4-5": "Seedream 4.5",
  "gpt-image-2": "GPT Image 2",
}

const KIE_TASK_TIMEOUT_MS = 240_000

export function getImageModelLabel(model: string) {
  return MODEL_LABELS[model as ImageModelId] || model
}

function getKieApiKey() {
  const value = process.env.KIE_API_KEY?.trim()
  if (!value) {
    throw new Error("Не настроена переменная KIE_API_KEY в Vercel")
  }
  return value
}

function getKieApiBaseUrl() {
  return (process.env.KIE_API_BASE_URL || "https://api.kie.ai").replace(
    /\/$/,
    ""
  )
}

function getKieUploadBaseUrl() {
  return (
    process.env.KIE_UPLOAD_API_BASE_URL || "https://kieai.redpandaai.co"
  ).replace(/\/$/, "")
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function getErrorMessage(value: unknown) {
  if (!isObject(value)) return ""

  const candidates = [
    value.msg,
    value.message,
    value.error,
    value.failMsg,
    value.fail_msg,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim()
    }
  }

  if (isObject(value.data)) {
    return getErrorMessage(value.data)
  }

  return ""
}

async function readJson(response: Response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: text }
  }
}

function sanitizeFileName(value: string) {
  const safe = value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")

  return safe || `reference-${Date.now()}.png`
}

async function uploadReference(reference: ReferenceFile) {
  const response = await fetch(
    `${getKieUploadBaseUrl()}/api/file-base64-upload`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getKieApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        base64Data: `data:${reference.mimeType};base64,${reference.bytes.toString("base64")}`,
        uploadPath: "neiropeiro/references",
        fileName: `${Date.now()}-${sanitizeFileName(reference.name)}`,
      }),
      cache: "no-store",
    }
  )

  const body = await readJson(response)
  const data = isObject(body) && isObject(body.data) ? body.data : null
  const downloadUrl =
    data && typeof data.downloadUrl === "string" ? data.downloadUrl : ""

  if (!response.ok || !downloadUrl) {
    throw new Error(
      getErrorMessage(body) ||
        `Kie.ai не смог загрузить референс (${response.status})`
    )
  }

  return downloadUrl
}

function getSeedreamQuality(imageSize: GenerateImageInput["imageSize"]) {
  return imageSize === "1K" ? "basic" : "high"
}

function buildKieTask(
  input: GenerateImageInput,
  referenceUrl: string | null
): { model: string; input: JsonObject } {
  if (input.model === "nano-banana-pro") {
    return {
      model: "nano-banana-pro",
      input: {
        prompt: input.prompt,
        image_input: referenceUrl ? [referenceUrl] : [],
        aspect_ratio: input.aspectRatio,
        resolution: input.imageSize,
        output_format: "png",
      },
    }
  }

  if (input.model === "seedream-4-5") {
    const common = {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
      quality: getSeedreamQuality(input.imageSize),
      nsfw_checker: false,
    }

    if (referenceUrl) {
      return {
        model: "seedream/4.5-edit",
        input: {
          ...common,
          image_urls: [referenceUrl],
        },
      }
    }

    return {
      model: "seedream/4.5-text-to-image",
      input: common,
    }
  }

  if (referenceUrl) {
    return {
      model: "gpt-image-2-image-to-image",
      input: {
        prompt: input.prompt,
        input_urls: [referenceUrl],
        aspect_ratio: input.aspectRatio,
      },
    }
  }

  return {
    model: "gpt-image-2-text-to-image",
    input: {
      prompt: input.prompt,
      aspect_ratio: input.aspectRatio,
    },
  }
}

async function createTask(task: { model: string; input: JsonObject }) {
  const response = await fetch(`${getKieApiBaseUrl()}/api/v1/jobs/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getKieApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(task),
    cache: "no-store",
  })

  const body = await readJson(response)
  const data = isObject(body) && isObject(body.data) ? body.data : null
  const taskId = data && typeof data.taskId === "string" ? data.taskId : ""

  if (!response.ok || !taskId) {
    throw new Error(
      getErrorMessage(body) ||
        `Kie.ai не смог создать задачу (${response.status})`
    )
  }

  return taskId
}

function parseJsonString(value: unknown): unknown {
  if (typeof value !== "string") return value

  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

function findResultUrl(value: unknown): string | null {
  const parsed = parseJsonString(value)

  if (typeof parsed === "string") {
    return /^https?:\/\//i.test(parsed) ? parsed : null
  }

  if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const found = findResultUrl(item)
      if (found) return found
    }
    return null
  }

  if (!isObject(parsed)) return null

  const preferredKeys = [
    "resultUrls",
    "result_urls",
    "urls",
    "images",
    "imageUrls",
    "image_urls",
    "output",
    "result",
    "url",
    "imageUrl",
    "image_url",
  ]

  for (const key of preferredKeys) {
    if (key in parsed) {
      const found = findResultUrl(parsed[key])
      if (found) return found
    }
  }

  for (const child of Object.values(parsed)) {
    const found = findResultUrl(child)
    if (found) return found
  }

  return null
}

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function getTaskDetails(taskId: string) {
  const response = await fetch(
    `${getKieApiBaseUrl()}/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      headers: {
        Authorization: `Bearer ${getKieApiKey()}`,
      },
      cache: "no-store",
    }
  )

  const body = await readJson(response)
  if (!response.ok) {
    throw new Error(
      getErrorMessage(body) ||
        `Не получилось проверить задачу Kie.ai (${response.status})`
    )
  }

  return body
}

async function waitForResult(taskId: string) {
  const startedAt = Date.now()
  let delay = 2_000

  while (Date.now() - startedAt < KIE_TASK_TIMEOUT_MS) {
    await sleep(delay)
    delay = Math.min(Math.round(delay * 1.35), 8_000)

    const body = await getTaskDetails(taskId)
    const data = isObject(body) && isObject(body.data) ? body.data : null

    if (!data) {
      throw new Error(getErrorMessage(body) || "Kie.ai вернул пустой статус")
    }

    const state =
      typeof data.state === "string" ? data.state.toLowerCase() : ""

    if (state === "success") {
      const resultUrl = findResultUrl(data.resultJson ?? data.result)
      if (!resultUrl) {
        throw new Error("Kie.ai завершил задачу, но не вернул ссылку на изображение")
      }
      return resultUrl
    }

    if (state === "fail" || state === "failed" || state === "error") {
      throw new Error(
        getErrorMessage(data) || "Генерация изображения в Kie.ai завершилась ошибкой"
      )
    }
  }

  throw new Error(
    "Генерация занимает слишком много времени. Проверьте задачу в журнале Kie.ai."
  )
}

export async function generateImage(
  input: GenerateImageInput
): Promise<GeneratedImage> {
  const referenceUrl = input.reference
    ? await uploadReference(input.reference)
    : null

  const task = buildKieTask(input, referenceUrl)
  const taskId = await createTask(task)
  const resultUrl = await waitForResult(taskId)

  return {
    url: resultUrl,
    providerModel: task.model,
  }
}
