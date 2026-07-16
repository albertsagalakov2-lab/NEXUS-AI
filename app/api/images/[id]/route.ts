import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    console.error("Image delete auth error:", {
      type: authError.name,
      message: authError.message,
    })

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { error } = await supabase
    .from("image_generations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Image delete failed:", {
      code: error.code,
      message: error.message,
    })

    return NextResponse.json(
      { error: "Не удалось удалить изображение." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
