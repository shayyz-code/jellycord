import { ImageResponse } from "next/og"
import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username")

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000"

  // Fetch profile data
  let profile = null

  if (username) {
    try {
      const res = await fetch(`${baseUrl}/api/profile?username=${username}`)
      if (res.ok) {
        const data = await res.json()
        profile = data.profile
      }
    } catch {
      // Use defaults if fetch fails
    }
  }

  const name = profile?.name || "Jellycord User"
  const bio = profile?.bio || "Share your profile in the cutest way"
  const primaryColor = profile?.primaryColor || "#f472b6"
  const avatar = profile?.avatar
  const character = profile?.character
  const banner = profile?.banner

  // Get the avatar image URL
  const avatarUrl = avatar
    ? avatar
    : `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/placeholder-user.jpg`

  // Get the character image URL
  const characterUrl = character
    ? `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}${character}`
    : null

  // Get the banner image URL
  const bannerUrl =
    banner && banner !== "/banners/default-banner.jpg"
      ? banner
      : `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}/banners/default-banner.jpg`

  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: "#fdf2f8",
        backgroundImage: `radial-gradient(circle at 20% 80%, ${primaryColor}30 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${primaryColor}20 0%, transparent 50%)`,
      }}
    >
      <img
        src={bannerUrl || "/banners/default-banner.jpg"}
        alt={name}
        width={630}
        height={630}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* JellyCord Badge */}
      <img
        src={baseUrl + "/jellycord-banner.png"}
        alt="JellyCord Badge"
        width={300}
        height={88}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
        }}
      />
      <div
        style={{
          width: 400,
          height: 128,
        }}
      />

      {/* Card */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          backgroundColor: "oklch(0.15 0.02 320)",
          padding: "48px 64px",
          boxShadow: `0 8px 32px ${primaryColor}40`,
          border: `4px solid ${primaryColor}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
          {/* Avatar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 160,
              height: 160,
              borderRadius: "50%",
              backgroundColor: `${primaryColor}20`,
              border: `4px solid ${primaryColor}`,
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl || "/placeholder-user.jpg"}
                alt={name}
                width={140}
                height={140}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 64,
                  color: primaryColor,
                }}
              >
                J
              </div>
            )}
          </div>

          {/* Character */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 80,
              borderRadius: "50%",
              backgroundColor: `${primaryColor}20`,
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            {characterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={characterUrl || "/placeholder.svg"}
                alt={name}
                width={70}
                height={70}
                style={{
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: 64,
                  color: primaryColor,
                }}
              >
                J
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "white",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          {name}
        </div>

        {/* Bio */}
        <div
          style={{
            fontSize: 24,
            color: "#c1cce3",
            textAlign: "center",
            maxWidth: 500,
            marginBottom: 24,
            lineHeight: 1.4,
          }}
        >
          {bio.length > 80 ? bio.slice(0, 80) + "..." : bio}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  )
}
