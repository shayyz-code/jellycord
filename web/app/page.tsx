"use client"

import { useState } from "react"
import { motion, Variants } from "framer-motion"
import { ProfileCard } from "@/components/profile-card"
import { CustomizationPanel } from "@/components/customization-panel"
import { JellycordLogo } from "@/components/jellycord-logo"
import Nav from "@/components/nav"

const DEFAULT_PROFILE = {
  name: "Jelly",
  bio: "Programmer & pixel enthusiast.",
  links: [
    {
      type: "twitter" as const,
      url: "https://twitter.com",
      label: "@shePrefersShayy",
    },
    {
      type: "instagram" as const,
      url: "https://instagram.com",
      label: "@jpg.shayy",
    },
    {
      type: "github" as const,
      url: "https://github.com",
      label: "shayyz-code",
    },
    {
      type: "website" as const,
      url: "https://codewithshayy.com",
      label: "codewithshayy",
    },
  ],
}

export default function Home() {
  const [primaryColor, setPrimaryColor] = useState("#facc15")
  const [avatar, setAvatar] = useState("/placeholder-user.jpg")
  const [character, setCharacter] = useState("/characters/pixel-dog.png")
  const [banner, setBanner] = useState("/banners/default-banner.jpg")

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    },
  }

  return (
    <motion.main
      className="min-h-screen bg-background py-8 px-4 relative"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <Nav />
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="text-center mb-8 relative z-10"
      >
        <JellycordLogo primaryColor={primaryColor} />
        <p className="text-muted-foreground text-sm mt-2">Share your profile</p>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 relative z-10">
        {/* Preview */}
        <motion.div variants={itemVariants} className="order-1 w-full max-w-xl">
          <div className="text-center mb-3">
            <span
              className="inline-block px-3 py-1 text-xs font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Preview
            </span>
          </div>
          <ProfileCard
            name={DEFAULT_PROFILE.name}
            bio={DEFAULT_PROFILE.bio}
            avatar={avatar}
            character={character}
            banner={banner}
            links={DEFAULT_PROFILE.links}
            primaryColor={primaryColor}
          />
        </motion.div>

        {/* Customization */}
        <motion.div variants={itemVariants} className="order-2 w-full max-w-sm">
          <CustomizationPanel
            primaryColor={primaryColor}
            onColorChange={setPrimaryColor}
            character={character}
            onCharacterChange={setCharacter}
            banner={banner}
            onBannerChange={setBanner}
          />
        </motion.div>
      </div>

      {/* Footer */}
      <motion.footer
        variants={itemVariants}
        className="text-center mt-12 text-xs text-muted-foreground relative z-10"
      >
        Powered by <span className="text-[#facc15] font-bold">jellycord</span>
      </motion.footer>
    </motion.main>
  )
}
