"use client"

import { Card } from "@/components/ui/card"
import { ColorPicker } from "./color-picker"
import { CharacterPicker } from "./character-picker"
import { BannerPicker } from "./banner-picker"
import { Palette, Sparkles, ImageIcon } from "lucide-react"

interface CustomizationPanelProps {
  primaryColor: string
  onColorChange: (color: string) => void
  character: string
  onCharacterChange: (character: string) => void
  banner: string
  onBannerChange: (banner: string) => void
}

export function CustomizationPanel({
  primaryColor,
  onColorChange,
  character,
  onCharacterChange,
  banner,
  onBannerChange,
}: CustomizationPanelProps) {
  return (
    <Card className="w-full max-w-sm p-5 space-y-5 border-2 border-border/50 bg-card">
      <div className="text-center">
        <h3 className="font-bold text-lg text-card-foreground">
          Customize Your Profile
        </h3>
      </div>

      {/* Color Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <Palette className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-card-foreground">
            Theme Color
          </span>
        </div>
        <ColorPicker
          selectedColor={primaryColor}
          onColorChange={onColorChange}
        />
      </div>

      {/* Character Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-card-foreground">
            Pixel Character
          </span>
        </div>
        <CharacterPicker
          selectedCharacter={character}
          onCharacterChange={onCharacterChange}
        />
      </div>

      {/* Banner Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-card-foreground">
            Profile Banner
          </span>
        </div>
        <BannerPicker
          banner={banner}
          onBannerChange={onBannerChange}
        />
      </div>
    </Card>
  )
}
