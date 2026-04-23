"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth-context"
import { Loader2 } from "lucide-react"

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "login") {
        const result = await login(username, password)
        if (!result.success) {
          setError(result.error || "Login failed")
        } else {
          onOpenChange(false)
          resetForm()
        }
      } else {
        if (!username.trim()) {
          setError("Username is required")
          setLoading(false)
          return
        }
        const result = await register(username, password)
        if (!result.success) {
          setError(result.error || "Registration failed")
        } else {
          onOpenChange(false)
          resetForm()
        }
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setUsername("")
    setPassword("")
    setError("")
  }

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login")
    setError("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            {mode === "login" ? "Welcome back!" : "Create account"}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            {mode === "login"
              ? "Sign in to edit your Jellycord profile"
              : "Join Jellycord and share your profile"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="coolperson"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="bg-input border-border"
            />
            {mode === "register" && (
              <p className="text-[10px] text-muted-foreground">
                This will be your profile URL: jellycord.app/
                {username.toLowerCase().replace(/\s+/g, "-") || "username"}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-input border-border"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive text-center bg-destructive/10 py-2 px-3 rounded-lg border border-destructive/20">
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2 font-semibold"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>

          <p className="text-center text-sm text-muted-foreground pt-2">
            {mode === "login"
              ? "Don't have an account?"
              : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={switchMode}
              className="text-primary hover:underline font-medium"
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
