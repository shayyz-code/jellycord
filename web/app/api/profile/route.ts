import { NextRequest, NextResponse } from "next/server"
import { apiFetchServer } from "@/lib/api-server"

export interface Profile {
  username: string
  name: string
  bio: string
  avatar: string
  character: string
  banner: string
  primaryColor: string
  links: any
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : undefined

  if (username) {
    try {
      const data = await apiFetchServer(`/profile/${username}`)
      const profile = {
        username: data.username,
        name: data.name || data.username,
        bio: data.bio || "",
        avatar: data.avatar || "/placeholder-user.jpg",
        character: data.character || "/characters/pixel-cat.png",
        banner: data.banner || "/banners/default-banner.jpg",
        primaryColor: data.primary_color || "#f472b6",
        links: data.links ? JSON.parse(data.links) : {},
      }
      return NextResponse.json({ profile })
    } catch (error) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
  }

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const me = await apiFetchServer("/me", {}, token)
    const data = await apiFetchServer(`/profile/${me.username}`, {}, token)
    const profile = {
      username: data.username,
      name: data.name || data.username,
      bio: data.bio || "",
      avatar: data.avatar || "/placeholder-user.jpg",
      character: data.character || "/characters/pixel-cat.png",
      banner: data.banner || "/banners/default-banner.jpg",
      primaryColor: data.primary_color || "#f472b6",
      links: data.links ? JSON.parse(data.links) : {},
    }
    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization")
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : undefined

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const profileUpdate = {
      name: body.name,
      bio: body.bio,
      avatar: body.avatar,
      character: body.character,
      banner: body.banner,
      primary_color: body.primaryColor,
      links: JSON.stringify(body.links || {}),
    }

    const data = await apiFetchServer(
      "/profile",
      {
        method: "POST",
        body: JSON.stringify(profileUpdate),
      },
      token,
    )

    const profile = {
      username: data.username,
      name: data.name || data.username,
      bio: data.bio || "",
      avatar: data.avatar || "/placeholder-user.jpg",
      character: data.character || "/characters/pixel-cat.png",
      banner: data.banner || "/banners/default-banner.jpg",
      primaryColor: data.primary_color || "#f472b6",
      links: data.links ? JSON.parse(data.links) : {},
    }

    return NextResponse.json({ profile })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update profile" },
      { status: 500 },
    )
  }
}
