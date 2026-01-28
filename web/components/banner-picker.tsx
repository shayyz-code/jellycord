"use client"

import React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { ImageIcon, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface BannerPickerProps {
  banner: string
  onBannerChange: (banner: string) => void
}

const PRESET_BANNERS = ["/banners/default-banner.jpg"]

const GIF_BANNERS = [
  "https://media.giphy.com/media/xT9IgzoKnwFNmISR8I/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/3o7btQ0NH6Kl8CxCfK/giphy.gif",
]

export function BannerPicker({ banner, onBannerChange }: BannerPickerProps) {
  const [showOptions, setShowOptions] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          onBannerChange(event.target.result as string)
          setShowOptions(false)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-3">
      <div
        className="relative h-24 overflow-hidden cursor-pointer group"
        onClick={() => setShowOptions(!showOptions)}
      >
        {banner ? (
          <Image
            src={banner || "/placeholder.svg"}
            alt="Profile banner"
            fill
            className="object-cover"
            unoptimized={banner.includes("giphy") || banner.startsWith("data:")}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center">
          <span className="text-card text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Change Banner
          </span>
        </div>
      </div>

      {showOptions && (
        <div className="space-y-3 p-3 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 text-xs"
            >
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </Button>
            {banner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onBannerChange("")
                  setShowOptions(false)
                }}
                className="text-xs"
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

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Animated GIFs
            </p>
            <div className="grid grid-cols-3 gap-2">
              {GIF_BANNERS.map((gif, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onBannerChange(gif)
                    setShowOptions(false)
                  }}
                  className={cn(
                    "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                    banner === gif ? "border-primary" : "border-transparent",
                  )}
                >
                  <Image
                    src={gif || "/placeholder.svg"}
                    alt={`GIF banner ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">
              Static Banners
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
                    "relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-105",
                    banner === preset ? "border-primary" : "border-transparent",
                  )}
                >
                  <Image
                    src={preset || "/placeholder.svg"}
                    alt={`Preset banner ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
