import { NextRequest, NextResponse } from "next/server"
import { apiFetchServer } from "@/lib/api-server"

export interface Status {
  id: string
  username: string
  content: string
  mood?: string
  createdAt: string
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") || ""
  const limit = searchParams.get("limit") || "20"

  try {
    const data = await apiFetchServer(`/statuses?username=${username}&limit=${limit}`)
    return NextResponse.json({ statuses: data.statuses })
  } catch (error) {
    return NextResponse.json({ statuses: [] })
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { content, mood } = body

    const data = await apiFetchServer("/statuses", {
      method: "POST",
      body: JSON.stringify({ content, mood }),
    }, token)

    return NextResponse.json({ status: data })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create status" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined

  if (!token) {
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

    await apiFetchServer(`/statuses/${id}`, {
      method: "DELETE",
    }, token)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete status" },
      { status: 500 },
    )
  }
}
