"use client"

import React, { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { ImageIcon, Upload, X, Search, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase-browser"

interface BannerPickerProps {
  banner: string
  onBannerChange: (banner: string) => void
  userId?: string
}

const PRESET_BANNERS = ["/banners/default-banner.jpg"]

// Tenor public key for demo/testing purposes
const TENOR_KEY = "LIVDSRZULELA"
const TENOR_CLIENT_KEY = "jellycord"

export function BannerPicker({
  banner,
  onBannerChange,
  userId,
}: BannerPickerProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [gifs, setGifs] = useState<string[]>([])
  const [searching, setSearching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Initial popular GIFs
  useEffect(() => {
    if (showOptions && gifs.length === 0) {
      searchGifs("anime scenery")
    }
  }, [showOptions])

  const searchGifs = async (query: string) => {
    if (!query) return
    setSearching(true)
    try {
      // Using Tenor API with public key
      const response = await fetch(
        `https://g.tenor.com/v1/search?q=${encodeURIComponent(
          query,
        )}&key=${TENOR_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=12&media_filter=minimal`,
      )
      const data = await response.json()
      if (data.results) {
        const gifUrls = data.results.map(
          (result: any) => result.media[0].gif.url,
        )
        setGifs(gifUrls)
      }
    } catch (error) {
      console.error("Failed to search GIFs:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB")
      return
    }

    if (!userId) {
      // Demo mode: use local data URL
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onBannerChange(event.target.result as string)
          setShowOptions(false)
        }
      }
      reader.readAsDataURL(file)
      return
    }

    setUploading(true)
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from("banners")
        .upload(fileName, file, {
          upsert: true,
        })

      if (uploadError) {
        // Fallback to data URL if storage fails (e.g. bucket doesn't exist)
        console.warn(
          "Storage upload failed, falling back to data URL:",
          uploadError,
        )
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            onBannerChange(event.target.result as string)
            setShowOptions(false)
          }
        }
        reader.readAsDataURL(file)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("banners").getPublicUrl(fileName)

      onBannerChange(publicUrl)
      setShowOptions(false)
    } catch (error) {
      console.error("Error uploading banner:", error)
      alert("Failed to upload banner")
    } finally {
      setUploading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchGifs(searchQuery)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="relative h-32 overflow-hidden cursor-pointer group border border-border"
        onClick={() => setShowOptions(!showOptions)}
      >
        {banner ? (
          <Image
            src={banner || "/placeholder.svg"}
            alt="Profile banner"
            fill
            className="object-cover"
            unoptimized={
              banner.includes("tenor") ||
              banner.includes("giphy") ||
              banner.startsWith("data:")
            }
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 backdrop-blur-sm border border-white/20">
            Change Banner
          </span>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {showOptions && (
        <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 text-xs"
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Upload className="w-3 h-3 mr-1" />
              )}
              Upload Image
            </Button>
            {banner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onBannerChange("")
                  setShowOptions(false)
                }}
                className="text-xs px-2"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.gif"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search GIFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-8 pl-8 text-xs bg-background/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                {searching ? (
                  <div className="col-span-full py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                  </div>
                ) : (
                  <>
                    {gifs.map((gif, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          onBannerChange(gif)
                          setShowOptions(false)
                        }}
                        className={cn(
                          "relative aspect-video rounded-md overflow-hidden border-2 transition-all hover:scale-[1.02] active:scale-95 group",
                          banner === gif
                            ? "border-primary"
                            : "border-transparent",
                        )}
                      >
                        <Image
                          src={gif || "/placeholder.svg"}
                          alt={`GIF ${i + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </button>
                    ))}
                  </>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Presets
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_BANNERS.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onBannerChange(preset)
                      setShowOptions(false)
                    }}
                    className={cn(
                      "relative aspect-video rounded-md overflow-hidden border-2 transition-all hover:scale-[1.02]",
                      banner === preset
                        ? "border-primary"
                        : "border-transparent",
                    )}
                  >
                    <Image
                      src={preset || "/placeholder.svg"}
                      alt={`Preset ${i + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
