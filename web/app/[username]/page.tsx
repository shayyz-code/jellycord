import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { PublicProfile } from "./public-profile"
import { apiFetchServer } from "@/lib/api-server"

// Demo profiles store (shared with API in a real app)
async function getProfile(username: string) {
  try {
    const data = await apiFetchServer(`/profile/${username}`)
    return {
      username: data.username,
      name: data.name || data.username,
      bio: data.bio || "",
      avatar: data.avatar || "/placeholder-user.jpg",
      character: data.character || "/characters/pixel-cat.png",
      banner: data.banner || "/banners/default-banner.jpg",
      primaryColor: data.primary_color || "#f472b6",
      links: data.links ? JSON.parse(data.links) : {},
    }
  } catch (error) {
    console.error("Failed to fetch profile:", error)
    return null
  }
}

async function getStatuses(username: string) {
  try {
    const data = await apiFetchServer(`/statuses?username=${username}`)
    return data || []
  } catch (error) {
    console.error("Failed to fetch statuses:", error)
    return []
  }
}

interface PageProps {
  params: Promise<{ username: string }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params
  const profile = await getProfile(username)

  if (!profile) {
    return {
      title: "Profile Not Found - Jellycord",
    }
  }

  const title = `${profile.name} (@${profile.username}) - Jellycord`
  const description =
    profile.bio || `Check out ${profile.name}'s profile on Jellycord`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      username: profile.username || undefined,
      images: [
        {
          url: `/api/og?username=${username}`,
          width: 1200,
          height: 630,
          alt: `${profile.name}'s Jellycord Profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?username=${username}`],
    },
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params
  const profile = await getProfile(username)
  const statuses = await getStatuses(username)

  if (!profile) {
    notFound()
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    alternateName: profile.username,
    description: profile.bio,
    image: profile.avatar,
    url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/${username}`,
    sameAs: profile.links
      ? Object.values(profile.links).filter((link) => typeof link === "string")
      : [],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicProfile profile={profile} statuses={statuses} />
    </>
  )
}
