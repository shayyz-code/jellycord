import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");

  // Fetch profile data
  let profile = null;
  
  if (username) {
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";
        
      const res = await fetch(`${baseUrl}/api/profile?username=${username}`);
      if (res.ok) {
        const data = await res.json();
        profile = data.profile;
      }
    } catch {
      // Use defaults if fetch fails
    }
  }

  const name = profile?.name || "Jellycord User";
  const bio = profile?.bio || "Share your profile in the cutest way";
  const primaryColor = profile?.primaryColor || "#f472b6";
  const character = profile?.character;

  // Get the character image URL
  const characterUrl = character
    ? `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"}${character}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fdf2f8",
          backgroundImage: `radial-gradient(circle at 20% 80%, ${primaryColor}30 0%, transparent 50%), radial-gradient(circle at 80% 20%, ${primaryColor}20 0%, transparent 50%)`,
        }}
      >
        {/* Card */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            backgroundColor: "white",
            borderRadius: 32,
            padding: "48px 64px",
            boxShadow: `0 8px 32px ${primaryColor}40`,
            border: `4px solid ${primaryColor}`,
          }}
        >
          {/* Character Avatar */}
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
            {characterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={characterUrl || "/placeholder.svg"}
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

          {/* Name */}
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#1f2937",
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
              color: "#6b7280",
              textAlign: "center",
              maxWidth: 500,
              marginBottom: 24,
              lineHeight: 1.4,
            }}
          >
            {bio.length > 80 ? bio.slice(0, 80) + "..." : bio}
          </div>

          {/* Jellycord Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              backgroundColor: primaryColor,
              color: "white",
              padding: "12px 24px",
              borderRadius: 999,
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ marginRight: 4 }}
            >
              <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.3" />
              <circle cx="9" cy="10" r="2" fill="white" />
              <circle cx="15" cy="10" r="2" fill="white" />
              <path
                d="M8 15 Q12 18 16 15"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            jellycord
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
