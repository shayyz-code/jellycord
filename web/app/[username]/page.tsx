import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { PublicProfile } from "./public-profile"

// Demo profiles store (shared with API in a real app)
async function getProfile(username: string) {
  // In production, this would fetch from your API
  const baseUrl = process.env.BASE_URL
    ? `${process.env.BASE_URL}`
    : "http://localhost:3000"

  console.log("base url: ", baseUrl)

  try {
    const res = await fetch(`${baseUrl}/api/profile?username=${username}`, {
      cache: "no-store",
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.profile
  } catch {
    return null
  }
}

async function getStatuses(username: string) {
  const baseUrl = process.env.BASE_URL
    ? `${process.env.BASE_URL}`
    : "http://localhost:3000"

  try {
    const res = await fetch(`${baseUrl}/api/status?username=${username}`, {
      cache: "no-store",
    })

    if (!res.ok) return []

    const data = await res.json()
    return data.statuses || []
  } catch {
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

  return <PublicProfile profile={profile} statuses={statuses} />
}
