import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export interface Profile {
  id: string
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

  const supabase = await createClient()

  if (username) {
    // Get public profile by username
    try {
      const { data: user, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single()

      if (error || !user) throw error

      const profile = {
        id: user.id,
        username: user.username,
        name: user.name,
        bio: user.bio || "",
        avatar: user.avatar || "/placeholder-user.jpg",
        character: user.character || "/characters/pixel-cat.jpg",
        banner: user.banner || "/banners/default-banner.jpg",
        primaryColor: user.primary_color || "#f472b6",
        links: user.links || {},
      }

      return NextResponse.json({ profile })
    } catch (error) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }
  }

  // Get current user's profile
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Fetch latest user data
    const { data: fullUser, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) throw error

    const profile = {
      id: fullUser.id,
      username: fullUser.username,
      name: fullUser.name,
      bio: fullUser.bio || "",
      avatar: fullUser.avatar || "/placeholder-user.jpg",
      character: fullUser.character || "/characters/pixel-cat.jpg",
      banner: fullUser.banner || "/banners/default-banner.jpg",
      primaryColor: fullUser.primary_color || "#f472b6",
      links: fullUser.links || {},
    }

    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

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

    // Update user in Supabase
    const { data: updatedUser, error } = await supabase
      .from("profiles")
      .update({
        name: body.name,
        bio: body.bio,
        avatar: body.avatar,
        character: body.character,
        banner: body.banner,
        primary_color: body.primaryColor,
        links: body.links,
      })
      .eq("id", user.id)
      .select()
      .single()

    if (error) throw error

    const profile = {
      id: updatedUser.id,
      username: updatedUser.username,
      name: updatedUser.name,
      bio: updatedUser.bio || "",
      avatar: updatedUser.avatar || "/placeholder-user.jpg",
      character: updatedUser.character || "/characters/pixel-cat.jpg",
      banner: updatedUser.banner || "/banners/default-banner.jpg",
      primaryColor: updatedUser.primary_color || "#f472b6",
      links: updatedUser.links || {},
    }

    return NextResponse.json({ profile })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    )
  }
}
