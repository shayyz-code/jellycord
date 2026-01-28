"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Send, Loader2, Sparkles } from "lucide-react"

const MOODS = [
  { emoji: "✨", label: "Vibing" },
  { emoji: "💭", label: "Thinking" },
  { emoji: "🎮", label: "Gaming" },
  { emoji: "💻", label: "Working" },
  { emoji: "🎵", label: "Listening" },
  { emoji: "☕", label: "Chilling" },
  { emoji: "🌙", label: "Sleepy" },
  { emoji: "🔥", label: "On Fire" },
]

interface StatusComposerProps {
  primaryColor: string
  onStatusPosted: () => void
}

export function StatusComposer({
  primaryColor,
  onStatusPosted,
}: StatusComposerProps) {
  const [content, setContent] = useState("")
  const [mood, setMood] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!content.trim()) return

    setPosting(true)
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mood }),
      })

      if (res.ok) {
        setContent("")
        setMood(null)
        onStatusPosted()
      }
    } catch (error) {
      console.error("Failed to post status:", error)
    } finally {
      setPosting(false)
    }
  }

  const remaining = 280 - content.length

  return (
    <Card className="border-2 border-border/50">
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${primaryColor}30` }}
          >
            <Sparkles className="w-5 h-5" style={{ color: primaryColor }} />
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="resize-none border-0 bg-transparent focus-visible:ring-0 text-sm min-h-[60px]"
              maxLength={280}
            />

            {/* Mood selector */}
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setMood(mood === m.label ? null : m.label)}
                  className={`px-2.5 py-1 text-xs font-medium transition-all ${
                    mood === m.label
                      ? "text-white"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  style={
                    mood === m.label
                      ? { backgroundColor: primaryColor }
                      : undefined
                  }
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <span
                className={`text-xs ${
                  remaining < 20
                    ? remaining < 0
                      ? "text-destructive"
                      : "text-amber-500"
                    : "text-muted-foreground"
                }`}
              >
                {remaining} characters left
              </span>
              <Button
                size="sm"
                onClick={handlePost}
                disabled={posting || !content.trim() || remaining < 0}
                className="px-4 text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {posting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-1.5" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
