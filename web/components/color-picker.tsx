"use client"

import { cn } from "@/lib/utils"

interface ColorPickerProps {
  selectedColor: string
  onColorChange: (color: string) => void
}

const PRESET_COLORS = [
  { name: "Lemon", value: "#facc15", hue: "50" },
  { name: "Rose", value: "#f472b6", hue: "350" },
  { name: "Peach", value: "#fb923c", hue: "25" },
  { name: "Mint", value: "#4ade80", hue: "145" },
  { name: "Sky", value: "#38bdf8", hue: "200" },
  { name: "Lavender", value: "#a78bfa", hue: "265" },
  { name: "Grape", value: "#c084fc", hue: "290" },
  { name: "Coral", value: "#f87171", hue: "0" },
]

export function ColorPicker({
  selectedColor,
  onColorChange,
}: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {PRESET_COLORS.map((color) => (
        <button
          key={color.value}
          onClick={() => onColorChange(color.value)}
          className={cn(
            "w-8 h-8 transition-all duration-200 hover:scale-110",
            selectedColor === color.value
              ? "scale-110 ring-2 ring-offset-2 ring-offset-background"
              : "",
          )}
          style={
            {
              backgroundColor: color.value,
              "--ring-color": color.value,
            } as React.CSSProperties
          }
          title={color.name}
          aria-label={`Select ${color.name} color`}
        />
      ))}
    </div>
  )
}

export { PRESET_COLORS }
