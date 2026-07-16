import { NextResponse } from "next/server"

import {
  enforceRateLimit,
  hashRateLimitIdentifier,
} from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const fullName =
    body && typeof body.fullName === "string" ? body.fullName.trim().slice(0, 120) : ""
  const email =
    body && typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = body && typeof body.password === "string" ? body.password : ""
  const origin = new URL(request.url).origin

  if (!email || password.length < 6) {
    return NextResponse.json(
      { error: "Введите email и пароль не короче 6 символов." },
      { status: 400 }
    )
  }

  const identity = `email:${await hashRateLimitIdentifier(email)}`
  const rateLimited = await enforceRateLimit({
    identifier: identity,
    request,
    scope: "auth-attempt",
  })
  if (rateLimited) return rateLimited

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/chat`,
      data: { full_name: fullName },
    },
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Не получилось зарегистрироваться." },
      { status: 400 }
    )
  }

  const userRateLimited = await enforceRateLimit({
    scope: "auth-user",
    userId: data.user.id,
  })
  if (userRateLimited) {
    if (data.session) await supabase.auth.signOut()
    return userRateLimited
  }

  return NextResponse.json({ requiresEmailConfirmation: !data.session })
}
