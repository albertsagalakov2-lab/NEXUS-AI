import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const defaultSettings = {
  id: "global",
  site_name: "NeiroPeiro",
  primary_color: "#8b5cf6",
  radius: "0.75rem",
}

export async function GET() {
  const supabase = await createClient()

  const { data: existing, error: selectError } = await supabase
    .from("site_appearance_settings")
    .select("*")
    .eq("id", "global")
    .maybeSingle()

  if (selectError) {
    return NextResponse.json({ error: selectError.message }, { status: 500 })
  }

  if (existing) {
    const settings = {
      ...existing,
      site_name:
        existing.site_name === "NexusAI" || existing.site_name === "NeuroParrot"
          ? "NeiroPeiro"
          : existing.site_name,
      primary_color:
        existing.primary_color === "#10b981" ||
        existing.primary_color === "#38bdf8"
          ? "#8b5cf6"
          : existing.primary_color,
    }

    return NextResponse.json({ settings })
  }

  return NextResponse.json({ settings: defaultSettings })
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

  const siteName = String(body.site_name || "NeiroPeiro").trim()
  const primaryColor = String(body.primary_color || "#8b5cf6")
  const radius = String(body.radius || "0.75rem")

  const { data, error } = await supabase
    .from("site_appearance_settings")
    .upsert(
      {
        id: "global",
        site_name: siteName || "NeiroPeiro",
        primary_color: primaryColor,
        radius,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    )
    .select("*")
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ settings: data })
}
