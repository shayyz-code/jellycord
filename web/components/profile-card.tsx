"use client"

import Image from "next/image"
import {
  Github,
  Twitter,
  Linkedin,
  Globe,
  Instagram,
  Mail,
  ArrowUpRight,
  Sparkles,
  MessageCircle,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import type { Status } from "@/app/api/status/route"

interface SocialLink {
  type: "github" | "twitter" | "linkedin" | "website" | "instagram" | "email"
  url: string
  label: string
}

interface ProfileCardProps {
  name: string
  bio: string
  avatar: string
  character: string
  banner?: string
  links: SocialLink[]
  primaryColor: string
  latestStatus?: Status | null
}

const iconMap = {
  github: Github,
  twitter: Twitter,
  linkedin: Linkedin,
  website: Globe,
  instagram: Instagram,
  email: Mail,
}

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

export function ProfileCard({
  name,
  bio,
  avatar,
  character,
  banner,
  links,
  primaryColor,
  latestStatus,
}: ProfileCardProps) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseX = useSpring(x, { stiffness: 500, damping: 100 })
  const mouseY = useSpring(y, { stiffness: 500, damping: 100 })

  function onMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect()
    x.set(clientX - left - width / 2)
    y.set(clientY - top - height / 2)
  }

  function onMouseLeave() {
    x.set(0)
    y.set(0)
  }

  const rotateX = useTransform(mouseY, [-300, 300], [5, -5])
  const rotateY = useTransform(mouseX, [-300, 300], [-5, 5])

  return (
    <motion.div
      style={{
        perspective: 1000,
        rotateX,
        rotateY,
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="w-full max-w-xl"
    >
      <Card className="w-full overflow-hidden shadow-xl border-2 py-0 border-border/50 bg-card transition-shadow duration-200 hover:shadow-2xl">
        {/* Banner */}
        <div className="relative h-40 overflow-hidden">
          {banner ? (
            <Image
              src={banner || "/placeholder.svg"}
              alt="Profile banner"
              fill
              className="object-cover"
              unoptimized={
                banner.includes("giphy") || banner.startsWith("data:")
              }
            />
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}40, ${primaryColor}20)`,
              }}
            />
          )}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(to top, ${primaryColor}60, transparent)`,
            }}
          />
        </div>

        {/* Avatar */}
        <div className="relative px-6 -mt-16 flex justify-between">
          <motion.div
            className="relative w-28 h-28"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Image
              src={avatar || "/placeholder-user.jpg"}
              alt={name}
              fill
              className="object-cover z-10 rounded-full border-2"
              style={{ borderColor: primaryColor }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 blur-2xl"
              style={{ backgroundColor: primaryColor }}
            />
            {/* Latest Status */}
            {latestStatus && (
              <div
                className="absolute top-1/2 left-32 -translate-y-1/2 px-3 py-2 bg-background rounded-xl z-30 border"
                style={{ borderColor: primaryColor }}
              >
                <div className="flex items-start gap-2">
                  <MessageCircle
                    className="w-4 h-4 mt-0.5 shrink-0"
                    style={{ color: primaryColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-card-foreground">
                      {latestStatus.content}
                    </p>
                    {latestStatus.mood && (
                      <span
                        className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {latestStatus.mood}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Character */}
          <motion.div
            className="relative w-24 h-24"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Image
              src={character || "/characters/pixel-dog.png"}
              alt={character.split("/").pop() || "pixel dog"}
              fill
              className="object-cover"
            />
          </motion.div>
        </div>

        {/* Content */}
        <div className="px-6 pt-3 pb-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-card-foreground">{name}</h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {bio}
            </p>
          </div>

          {/* Links */}
          <div className="space-y-2">
            {links.map((link) => {
              const Icon = iconMap[link.type]
              return (
                <motion.a
                  key={link.url}
                  href={link.type === "email" ? `mailto:${link.url}` : link.url}
                  target={link.type !== "email" ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 transition-all duration-200 group border-2 border-transparent hover:border-border"
                  style={{
                    backgroundColor: `${primaryColor}10`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${primaryColor}25`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = `${primaryColor}10`
                  }}
                  whileHover="hover"
                  variants={{ hover: { y: -2 } }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-9 h-9 flex items-center justify-center transition-colors"
                    style={{ backgroundColor: primaryColor }}
                    variants={{
                      hover: { rotate: [0, -10, 10, -5, 5, 0] },
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <Icon className="w-4 h-4 text-white" />
                  </motion.div>
                  <span className="flex-1 text-sm font-medium text-card-foreground">
                    {link.label}
                  </span>
                  <ArrowUpRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-70 group-hover:translate-x-0 transition-all text-muted-foreground" />
                </motion.a>
              )
            })}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
