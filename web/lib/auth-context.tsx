"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { apiFetch } from "@/lib/api"

interface User {
  username: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  register: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("jellycord_token")
      if (!token) {
        setUser(null)
        setLoading(false)
        return
      }

      const data = await apiFetch("/me")
      setUser({
        username: data.username,
        role: data.role,
      })
    } catch (error) {
      console.error("Failed to refresh user:", error)
      localStorage.removeItem("jellycord_token")
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })

      if (data.token) {
        localStorage.setItem("jellycord_token", data.token)
        setUser({
          username: data.user.username,
          role: data.user.role,
        })
        return { success: true }
      }

      return { success: false, error: "Invalid response from server" }
    } catch (error: any) {
      return { success: false, error: error.message || "Login failed" }
    }
  }

  const register = async (
    username: string,
    password: string,
  ) => {
    try {
      const data = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      })

      if (data.token) {
        localStorage.setItem("jellycord_token", data.token)
        setUser({
          username: data.user.username,
          role: data.user.role,
        })
        return { success: true }
      }

      return { success: false, error: "Registration failed" }
    } catch (error: any) {
      return { success: false, error: error.message || "Registration failed" }
    }
  }

  const logout = async () => {
    localStorage.removeItem("jellycord_token")
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
