"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface CharacterPickerProps {
  selectedCharacter: string
  onCharacterChange: (character: string) => void
}

const CHARACTERS = [
  { id: "cat", name: "Pixel Cat", src: "/characters/pixel-cat.png" },
  { id: "bunny", name: "Pixel Bunny", src: "/characters/pixel-bunny.png" },
  { id: "bear", name: "Pixel Bear", src: "/characters/pixel-bear.png" },
  { id: "frog", name: "Pixel Frog", src: "/characters/pixel-frog.png" },
  { id: "dog", name: "Pixel Dog", src: "/characters/pixel-dog.png" },
  { id: "ghost", name: "Pixel Ghost", src: "/characters/pixel-ghost.png" },
]

export function CharacterPicker({
  selectedCharacter,
  onCharacterChange,
}: CharacterPickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {CHARACTERS.map((character) => (
        <button
          key={character.id}
          onClick={() => onCharacterChange(character.src)}
          className={cn(
            "relative aspect-square overflow-hidden transition-all duration-200 hover:scale-105 border-3",
            selectedCharacter === character.src
              ? "border-primary ring-2 ring-primary/50 scale-105"
              : "border-transparent hover:border-primary/30",
          )}
          title={character.name}
          aria-label={`Select ${character.name}`}
        >
          <Image
            src={character.src || "/placeholder.svg"}
            alt={character.name}
            fill
            className="object-cover"
          />
        </button>
      ))}
    </div>
  )
}

export { CHARACTERS }
