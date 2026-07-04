import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getDemoThumbnailSize(aspectRatio: string) {
  if (aspectRatio === "9:16") return "576/1024"
  if (aspectRatio === "1:1") return "1024/1024"
  if (aspectRatio === "4:3") return "1024/768"

  return "1024/576"
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
    .from("video_generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ videos: data || [] })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const prompt = String(body.prompt || "").trim()
  const style = String(body.style || "cinematic")
  const aspectRatio = String(body.aspect_ratio || "16:9")
  const durationSeconds = Number(body.duration_seconds || 5)

  if (!prompt) {
    return NextResponse.json(
      { error: "Введите описание видео" },
      { status: 400 }
    )
  }

  const seed = encodeURIComponent(`${user.id}-${Date.now()}-${prompt}`)
  const size = getDemoThumbnailSize(aspectRatio)

  const demoThumbnailUrl = `https://picsum.photos/seed/${seed}/${size}`

  const { data, error } = await supabase
    .from("video_generations")
    .insert({
      user_id: user.id,
      prompt,
      style,
      aspect_ratio: aspectRatio,
      duration_seconds: durationSeconds,
      thumbnail_url: demoThumbnailUrl,
      video_url: null,
      status: "demo",
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ video: data })
}
