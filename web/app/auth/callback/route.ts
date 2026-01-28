import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Create profile if it doesn't exist
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .single()

        if (!existingProfile) {
          // Generate a base username from email or metadata
          const emailName = user.email?.split("@")[0]
          const metaName =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.user_metadata?.user_name
          const baseUsername = (metaName || emailName || "user")
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")

          // Ensure username is unique (simple retry strategy)
          let username = baseUsername
          let counter = 1
          let isUnique = false

          while (!isUnique && counter < 10) {
            const { data: conflict } = await supabase
              .from("profiles")
              .select("username")
              .eq("username", username)
              .single()

            if (!conflict) {
              isUnique = true
            } else {
              username = `${baseUsername}${Math.floor(Math.random() * 1000)}`
              counter++
            }
          }

          await supabase.from("profiles").insert({
            id: user.id,
            username: username,
            name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              username,
            avatar: user.user_metadata?.avatar_url || "/placeholder-user.jpg",
            primary_color: "#f472b6",
          })
        }
      }

      const forwardedHost = request.headers.get("x-forwarded-host") // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
