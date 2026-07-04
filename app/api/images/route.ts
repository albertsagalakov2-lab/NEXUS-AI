import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function getDemoImageSize(aspectRatio: string) {
  if (aspectRatio === "16:9") return "1024/576"
  if (aspectRatio === "9:16") return "576/1024"
  if (aspectRatio === "4:3") return "1024/768"

  return "1024/1024"
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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const prompt = String(body.prompt || "").trim()
  const style = String(body.style || "realistic")
  const aspectRatio = String(body.aspect_ratio || "1:1")

  if (!prompt) {
    return NextResponse.json(
      { error: "Введите описание изображения" },
      { status: 400 }
    )
  }

  const seed = encodeURIComponent(`${user.id}-${Date.now()}-${prompt}`)
  const size = getDemoImageSize(aspectRatio)

  const demoImageUrl = `https://picsum.photos/seed/${seed}/${size}`

  const { data, error } = await supabase
    .from("image_generations")
    .insert({
      user_id: user.id,
      prompt,
      style,
      aspect_ratio: aspectRatio,
      image_url: demoImageUrl,
      status: "demo",
    })
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ image: data })
}
