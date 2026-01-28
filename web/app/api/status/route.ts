import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export interface Status {
  id: string
  userId: string
  username: string
  content: string
  mood?: string
  createdAt: string
}

// GET - Get statuses for a user
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  const supabase = await createClient()

  try {
    let query = supabase
      .from("statuses")
      .select(
        `
        *,
        user:profiles!inner(username)
      `,
      )
      .order("created_at", { ascending: false })
      .limit(20)

    if (username) {
      // Filter by username via the relation
      query = query.eq("user.username", username)
    } else {
      // Get statuses for the logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      query = query.eq("user_id", user.id)
    }

    const { data: records, error } = await query

    if (error) throw error

    const statuses = records.map((record: any) => {
      return {
        id: record.id,
        userId: record.user_id,
        username: record.user?.username || "Unknown",
        content: record.content,
        mood: record.mood,
        createdAt: record.created_at,
      }
    })

    return NextResponse.json({ statuses })
  } catch (error) {
    // If user not found or other error
    return NextResponse.json({ statuses: [] })
  }
}

// POST - Create a new status
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, mood } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Status content is required" },
        { status: 400 },
      )
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: "Status must be 280 characters or less" },
        { status: 400 },
      )
    }

    const { data: record, error } = await supabase
      .from("statuses")
      .insert({
        user_id: user.id,
        content: content.trim(),
        mood,
      })
      .select(
        `
        *,
        user:profiles(username)
      `,
      )
      .single()

    if (error) throw error

    const newStatus = {
      id: record.id,
      userId: user.id,
      username: record.user?.username,
      content: record.content,
      mood: record.mood,
      createdAt: record.created_at,
    }

    return NextResponse.json({ status: newStatus })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create status" },
      { status: 500 },
    )
  }
}

// DELETE - Delete a status
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Status ID is required" },
        { status: 400 },
      )
    }

    // Verify ownership and delete in one go
    const { error } = await supabase
      .from("statuses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete status" },
      { status: 500 },
    )
  }
}
