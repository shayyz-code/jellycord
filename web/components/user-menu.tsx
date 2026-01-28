"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AuthModal } from "./auth-modal"
import { LogOut, Edit, Share2 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

export function UserMenu() {
  const { user, loading, logout } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (loading) {
    return <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
  }

  if (!user) {
    return (
      <>
        <Button onClick={() => setAuthModalOpen(true)} variant="default">
          Sign In
        </Button>
        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </>
    )
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="bg-transparent overflow-hidden hover:bg-muted/50 transition-colors"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <motion.div animate={isHovered ? "hover" : "idle"}>
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
              className="w-full h-full pointer-events-none"
            >
              <motion.path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                variants={{
                  idle: { scaleY: 1 },
                  hover: { scaleY: 0.9, y: 1 },
                }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              />
              <motion.circle
                cx="12"
                cy="7"
                r="4"
                variants={{
                  idle: { y: 0, rotate: 0 },
                  hover: { y: -2, rotate: [0, -15, 15, 0] },
                }}
                transition={{
                  y: { type: "spring", stiffness: 300, damping: 10 },
                  rotate: { duration: 0.5, ease: "easeInOut" },
                }}
              />
            </svg>
          </motion.div>
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{user.username}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/edit" className="cursor-pointer">
            <Edit className="mr-2 h-4 w-4" />
            Edit Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/${user.username}`} className="cursor-pointer">
            <Share2 className="mr-2 h-4 w-4" />
            View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="group cursor-pointer text-destructive focus:bg-red-700 focus:text-white"
        >
          <LogOut className="mr-2 h-4 w-4 text-red-700 group-focus:text-white" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
