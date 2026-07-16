type RateLimitScope =
  | "chat"
  | "images-read"
  | "images-write"
  | "auth-attempt"
  | "auth-user"

type RateLimitRule = {
  limit: number
  windowMs: number
}

type RateLimitPolicy = {
  ip: RateLimitRule
  user: RateLimitRule
}

type RateLimitResult = {
  limit: number
  remaining: number
  resetAt: number
  success: boolean
}

const POLICIES: Record<RateLimitScope, RateLimitPolicy> = {
  chat: {
    ip: { limit: 30, windowMs: 60_000 },
    user: { limit: 20, windowMs: 60_000 },
  },
  "images-read": {
    ip: { limit: 240, windowMs: 60_000 },
    user: { limit: 120, windowMs: 60_000 },
  },
  "images-write": {
    ip: { limit: 20, windowMs: 10 * 60_000 },
    user: { limit: 6, windowMs: 10 * 60_000 },
  },
  "auth-attempt": {
    ip: { limit: 10, windowMs: 10 * 60_000 },
    user: { limit: 5, windowMs: 10 * 60_000 },
  },
  "auth-user": {
    ip: { limit: 10, windowMs: 10 * 60_000 },
    user: { limit: 10, windowMs: 10 * 60_000 },
  },
}

const FIXED_WINDOW_SCRIPT = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
`

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "")
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null
  return { token, url }
}

function getClientIp(request: Request) {
  const forwardedFor =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")
  const candidate =
    forwardedFor?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim()

  if (!candidate) return "unknown"
  return candidate.slice(0, 128)
}

export async function hashRateLimitIdentifier(value: string) {
  const input = new TextEncoder().encode(value.trim().toLowerCase())
  const digest = await crypto.subtle.digest("SHA-256", input)
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("")
}

async function consume(
  scope: RateLimitScope,
  kind: "ip" | "user",
  identifier: string
): Promise<RateLimitResult> {
  const config = getRedisConfig()
  if (!config) {
    throw new Error("Upstash Redis rate limit is not configured")
  }

  const rule = POLICIES[scope][kind]
  const identifierHash = await hashRateLimitIdentifier(`${kind}:${identifier}`)
  const key = `nexus:ratelimit:${scope}:${kind}:${identifierHash}`

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      "EVAL",
      FIXED_WINDOW_SCRIPT,
      "1",
      key,
      String(rule.windowMs),
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(3_000),
  })

  const payload = (await response.json().catch(() => null)) as
    | { error?: string; result?: unknown }
    | null

  if (!response.ok || payload?.error || !Array.isArray(payload?.result)) {
    throw new Error("Upstash Redis rate limit request failed")
  }

  const count = Number(payload.result[0])
  const ttl = Math.max(0, Number(payload.result[1]))
  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error("Upstash Redis returned an invalid rate limit result")
  }

  return {
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt: Date.now() + ttl,
    success: count <= rule.limit,
  }
}

function unavailableResponse() {
  return Response.json(
    { error: "Rate limiting is temporarily unavailable." },
    {
      status: 503,
      headers: { "Retry-After": "60" },
    }
  )
}

function tooManyRequestsResponse(results: RateLimitResult[]) {
  const blocked = results.filter((result) => !result.success)
  const resetAt = Math.max(...blocked.map((result) => result.resetAt))
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1_000))
  const limit = Math.min(...blocked.map((result) => result.limit))

  return Response.json(
    { error: "Too Many Requests", retryAfter },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(resetAt / 1_000)),
      },
    }
  )
}

export async function enforceRateLimit(options: {
  identifier?: string
  request?: Request
  scope: RateLimitScope
  userId?: string | null
}) {
  const checks: Promise<RateLimitResult>[] = []

  if (options.request) {
    checks.push(consume(options.scope, "ip", getClientIp(options.request)))
  }
  if (options.userId) {
    checks.push(consume(options.scope, "user", options.userId))
  }
  if (options.identifier) {
    checks.push(consume(options.scope, "user", options.identifier))
  }

  if (checks.length === 0) {
    throw new Error("At least one rate limit identifier is required")
  }

  try {
    const results = await Promise.all(checks)
    return results.some((result) => !result.success)
      ? tooManyRequestsResponse(results)
      : null
  } catch (error) {
    console.error("Rate limit backend failed:", {
      type: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return unavailableResponse()
  }
}
