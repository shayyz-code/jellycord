"use client"

import { motion } from "framer-motion"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" className="w-10 h-10" />
  }

  const isDark = resolvedTheme === "dark"

  const toggleTheme = () => setTheme(isDark ? "light" : "dark")

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative w-10 h-10 hover:bg-muted/50 transition-colors"
      title="Toggle theme"
    >
      <div className="relative w-6 h-6 flex items-center justify-center pointer-events-none">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-full h-full"
        >
          {/* Moon Mask */}
          <mask id="moon-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.circle
              cx="24"
              cy="10"
              r="6"
              fill="black"
              animate={{
                cx: isDark ? 17 : 24,
                cy: isDark ? 4 : 10,
              }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
              }}
            />
          </mask>

          {/* Main Circle (Sun/Moon Body) */}
          <motion.circle
            cx="12"
            cy="12"
            r="5"
            fill="currentColor"
            mask="url(#moon-mask)"
            animate={{
              scale: isDark ? 1 : 0.5,
              rotate: isDark ? -10 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
            }}
          />

          {/* Sun Rays */}
          <motion.g
            stroke="currentColor"
            animate={{
              opacity: isDark ? 0 : 1,
              scale: isDark ? 0.5 : 1,
              rotate: isDark ? 90 : 0,
            }}
            transition={{
              type: "spring",
              stiffness: 150,
              damping: 15,
            }}
            style={{ originX: "12px", originY: "12px" }}
          >
            <path d="M12 2v2" />
            <path d="M12 20v2" />
            <path d="M4.93 4.93l1.41 1.41" />
            <path d="M17.66 17.66l1.41 1.41" />
            <path d="M2 12h2" />
            <path d="M20 12h2" />
            <path d="M6.34 17.66l-1.41 1.41" />
            <path d="M19.07 4.93l-1.41 1.41" />
          </motion.g>

          {/* Stars (Dark Mode) */}
          <motion.g
            fill="currentColor"
            initial={{ opacity: 0 }}
            animate={{
              opacity: isDark ? 1 : 0,
              scale: isDark ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            {/* Star 1 */}
            <motion.path
              d="M19 5l.5 1 .5-1 1-.5-1-.5-.5-1-.5 1-1 .5 1 .5z"
              animate={{
                scale: isDark ? [0, 1.2, 1] : 0,
                rotate: isDark ? [0, 45, 0] : 0,
              }}
              transition={{
                delay: isDark ? 0.1 : 0,
                duration: 0.4,
              }}
            />
            {/* Star 2 */}
            <motion.path
              d="M5 18l.5 1 .5-1 1-.5-1-.5-.5-1-.5 1-1 .5 1 .5z"
              animate={{
                scale: isDark ? [0, 1.2, 1] : 0,
                rotate: isDark ? [0, -45, 0] : 0,
              }}
              transition={{
                delay: isDark ? 0.2 : 0,
                duration: 0.4,
              }}
            />
            {/* Star 3 */}
            <motion.path
              d="M20 18l.5 1 .5-1 1-.5-1-.5-.5-1-.5 1-1 .5 1 .5z"
              animate={{
                scale: isDark ? [0, 1.2, 1] : 0,
                rotate: isDark ? [0, 90, 0] : 0,
              }}
              transition={{
                delay: isDark ? 0.3 : 0,
                duration: 0.4,
              }}
            />
          </motion.g>
        </svg>
      </div>
    </Button>
  )
}
