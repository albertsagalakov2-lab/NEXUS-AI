import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("chat_id", id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ messages: data || [] })
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))

  const role = body.role
  const content = body.content
  const title = body.title

  if (!content || !["user", "assistant"].includes(role)) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 })
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      chat_id: id,
      user_id: user.id,
      role,
      content,
    })
    .select("*")
    .single()

  if (error) {
    console.error("Insert chat message error:", error)

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const updateData: {
    updated_at: string
    title?: string
  } = {
    updated_at: new Date().toISOString(),
  }

  if (title) {
    updateData.title = title
  }

  await supabase
    .from("chats")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json({ message: data })
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: chat, error: chatError } = await supabase
    .from("chats")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  if (chatError || !chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 })
  }

  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .eq("chat_id", id)
    .eq("user_id", user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase
    .from("chats")
    .update({
      title: "Новый чат",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  return NextResponse.json({ success: true })
}
