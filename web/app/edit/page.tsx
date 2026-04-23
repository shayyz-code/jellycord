"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { ProfileCard } from "@/components/profile-card"
import { JellycordLogo } from "@/components/jellycord-logo"
import { ColorPicker } from "@/components/color-picker"
import { CharacterPicker } from "@/components/character-picker"
import { BannerPicker } from "@/components/banner-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Save,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  MessageCircle,
} from "lucide-react"
import type { Status } from "@/app/api/status/route"
import { StatusComposer } from "@/components/status-composer"
import { StatusFeed } from "@/components/status-feed"
import Nav from "@/components/nav"
import { apiFetch } from "@/lib/api"

type LinkType =
  | "github"
  | "twitter"
  | "linkedin"
  | "website"
  | "instagram"
  | "email"

const LINK_TYPES: { type: LinkType; label: string; placeholder: string }[] = [
  {
    type: "twitter",
    label: "Twitter / X",
    placeholder: "https://twitter.com/username",
  },
  {
    type: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/username",
  },
  {
    type: "github",
    label: "GitHub",
    placeholder: "https://github.com/username",
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/username",
  },
  { type: "website", label: "Website", placeholder: "https://yoursite.com" },
  { type: "email", label: "Email", placeholder: "hello@example.com" },
]

export default function EditProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [name, setName] = useState("")
  const [bio, setBio] = useState("")
  const [primaryColor, setPrimaryColor] = useState("#f472b6")
  const [avatar, setAvatar] = useState("/placeholder-user.jpg")
  const [character, setCharacter] = useState("/characters/pixel-cat.jpg")
  const [banner, setBanner] = useState("/banners/default-banner.jpg")
  const [links, setLinks] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [statusKey, setStatusKey] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    async function loadProfile() {
      if (!user) return

      try {
        const data = await apiFetch("/profile")
        if (data.profile) {
          setName(data.profile.name || "")
          setBio(data.profile.bio || "")
          setPrimaryColor(data.profile.primaryColor || "#f472b6")
          setAvatar(data.profile.avatar || "/placeholder-user.jpg")
          setCharacter(data.profile.character || "/characters/pixel-cat.jpg")
          setBanner(data.profile.banner || "/banners/default-banner.jpg")
          setLinks(data.profile.links || {})
        }
      } catch (error) {
        console.error("Failed to load profile:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadProfile()
    }
  }, [user])

  useEffect(() => {
    async function loadStatuses() {
      if (!user) return
      try {
        const data = await apiFetch(`/statuses?username=${user.username}`)
        setStatuses(data.statuses || [])
      } catch (error) {
        console.error("Failed to load statuses:", error)
      }
    }

    if (user) {
      loadStatuses()
    }
  }, [user, statusKey])

  const handleStatusChange = () => {
    setStatusKey((k) => k + 1)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)

    try {
      await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({
          username: user?.username,
          name,
          bio,
          primaryColor,
          character,
          banner,
          links,
        }),
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Failed to save profile:", error)
    } finally {
      setSaving(false)
    }
  }

  const handleLinkChange = (type: string, value: string) => {
    setLinks((prev) => ({ ...prev, [type]: value }))
  }

  const profileUrl = user
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${user.username}`
    : ""

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const profileLinks = Object.entries(links)
    .filter(([, url]) => url)
    .map(([type, url]) => ({
      type: type as LinkType,
      url: type === "email" ? `mailto:${url}` : url,
      label: url.replace(/https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
    }))

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4">
      {/* Top Navigation */}
      <Nav />

      {/* Header */}
      <div className="text-center mb-8">
        <JellycordLogo primaryColor={primaryColor} />
        <p className="text-muted-foreground text-sm mt-2">Edit your profile</p>
      </div>

      {/* Share URL */}
      <div className="max-w-md mx-auto mb-6">
        <div className="flex items-center gap-2 p-2 bg-card border border-border">
          <div className="flex-1 px-3 py-2 text-sm truncate text-muted-foreground">
            {profileUrl}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyProfileUrl}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`/${user.username}`, "_blank")}
            className="shrink-0"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-start justify-center gap-8">
        {/* Editor */}
        <div className="w-full lg:w-1/2 max-w-md">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="links">Links</TabsTrigger>
              <TabsTrigger value="style">Style</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Info</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="bg-input"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      className="bg-input resize-none"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="status" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Status Updates
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <StatusComposer
                    primaryColor={primaryColor}
                    onStatusPosted={handleStatusChange}
                  />
                  <StatusFeed
                    statuses={statuses}
                    primaryColor={primaryColor}
                    isOwner={true}
                    onStatusDeleted={handleStatusChange}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Social Links</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {LINK_TYPES.map(({ type, label, placeholder }) => (
                    <div key={type} className="flex flex-col gap-2">
                      <Label htmlFor={type}>{label}</Label>
                      <Input
                        id={type}
                        value={links[type] || ""}
                        onChange={(e) => handleLinkChange(type, e.target.value)}
                        placeholder={placeholder}
                        className="bg-input"
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="style" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Appearance</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  <div>
                    <Label className="mb-3 block">Primary Color</Label>
                    <ColorPicker
                      selectedColor={primaryColor}
                      onColorChange={setPrimaryColor}
                    />
                  </div>
                  <div>
                    <Label className="mb-3 block">Character</Label>
                    <CharacterPicker
                      selectedCharacter={character}
                      onCharacterChange={setCharacter}
                    />
                  </div>
                  <div>
                    <Label className="mb-3 block">Banner</Label>
                    <BannerPicker
                      banner={banner}
                      onBannerChange={setBanner}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-6">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full font-semibold"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="text-center mb-3">
            <span
              className="inline-block px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Live Preview
            </span>
          </div>
          <ProfileCard
            name={name || "Your Name"}
            bio={bio || "Your bio will appear here..."}
            avatar={avatar}
            character={character}
            banner={banner}
            links={profileLinks}
            primaryColor={primaryColor}
          />
        </div>
      </div>
    </main>
  )
}
