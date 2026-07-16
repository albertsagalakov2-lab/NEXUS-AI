import { NextResponse } from "next/server"

import {
  enforceRateLimit,
  hashRateLimitIdentifier,
} from "@/lib/rate-limit"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const email =
    body && typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = body && typeof body.password === "string" ? body.password : ""

  if (!email || !password) {
    return NextResponse.json(
      { error: "Введите email и пароль." },
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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message || "Invalid login credentials" },
      { status: 401 }
    )
  }

  const userRateLimited = await enforceRateLimit({
    scope: "auth-user",
    userId: data.user.id,
  })
  if (userRateLimited) {
    await supabase.auth.signOut()
    return userRateLimited
  }

  return NextResponse.json({ success: true })
}
