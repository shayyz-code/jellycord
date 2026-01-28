"use client"

import { ProfileCard } from "@/components/profile-card"
import { JellycordLogo } from "@/components/jellycord-logo"
import { StatusFeed } from "@/components/status-feed"
import type { Profile } from "@/app/api/profile/route"
import type { Status } from "@/app/api/status/route"
import { motion } from "framer-motion"

type LinkType =
  | "github"
  | "twitter"
  | "linkedin"
  | "website"
  | "instagram"
  | "email"

interface PublicProfileProps {
  profile: Profile
  statuses: Status[]
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

export function PublicProfile({ profile, statuses }: PublicProfileProps) {
  const profileLinks = Object.entries(profile.links || {})
    .filter(([, url]) => url)
    .map(([type, url]) => {
      const urlStr = url as string
      let finalUrl = urlStr

      // Add https:// if missing and not email
      if (
        type !== "email" &&
        !urlStr.startsWith("http") &&
        !urlStr.startsWith("//")
      ) {
        finalUrl = `https://${urlStr}`
      }

      return {
        type: type as LinkType,
        url: finalUrl,
        label: urlStr.replace(/https?:\/\/(www\.)?/, "").replace(/\/$/, ""),
      }
    })

  return (
    <main
      className="min-h-screen py-12 px-4 flex flex-col items-center"
      style={{
        background: `linear-gradient(135deg, ${profile.primaryColor}15 0%, transparent 50%)`,
        backgroundColor: "var(--background)",
      }}
    >
      <motion.div
        className="mb-8"
        initial="initial"
        animate="animate"
        variants={fadeInUp}
      >
        <JellycordLogo primaryColor={profile.primaryColor} size="sm" />
      </motion.div>

      <div className="w-full max-w-xl space-y-8">
        <motion.div
          initial="initial"
          animate="animate"
          variants={fadeInUp}
          transition={{ delay: 0.1 }}
        >
          <ProfileCard
            name={profile.name}
            bio={profile.bio}
            avatar={profile.avatar}
            character={profile.character}
            banner={profile.banner}
            links={profileLinks}
            primaryColor={profile.primaryColor}
            latestStatus={statuses[0]}
          />
        </motion.div>

        {statuses.length > 0 && (
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeInUp}
            transition={{ delay: 0.2 }}
          >
            <h3 className="text-lg font-semibold mb-4 px-2">Updates</h3>
            <StatusFeed
              statuses={statuses}
              primaryColor={profile.primaryColor}
            />
          </motion.div>
        )}
      </div>

      <motion.footer
        className="mt-12 text-center"
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        variants={fadeInUp}
        transition={{ delay: 0.3 }}
      >
        <a
          href="/"
          className="text-sm text-muted-foreground font-bold hover:text-foreground transition-colors"
          style={{ color: profile.primaryColor }}
        >
          Create your own profile on Jellycord
        </a>
      </motion.footer>
    </main>
  )
}
