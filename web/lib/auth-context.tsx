"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { createClient } from "@/lib/supabase-browser"
import {
  type AuthChangeEvent,
  type Session,
  type Provider,
} from "@supabase/supabase-js"

interface User {
  id: string
  email: string
  username: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>
  register: (
    email: string,
    password: string,
    username: string,
  ) => Promise<{ success: boolean; error?: string }>
  loginWithProvider: (
    provider: Provider,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const refreshUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        let username = user.user_metadata?.username
        if (!username) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single()
          username = profile?.username
        }

        setUser({
          id: user.id,
          email: user.email!,
          username: username || "Unknown",
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (session?.user) {
          let username = session.user.user_metadata?.username
          if (!username) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", session.user.id)
              .single()
            username = profile?.username
          }

          setUser({
            id: session.user.id,
            email: session.user.email!,
            username: username || "Unknown",
          })
        } else {
          setUser(null)
        }
        setLoading(false)
      },
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" }
    }
  }

  const register = async (
    email: string,
    password: string,
    username: string,
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name: username,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: data.user.id,
          username,
          name: username,
        })

        if (profileError) {
          console.error("Error creating profile:", profileError)
        }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" }
    }
  }

  const loginWithProvider = async (provider: Provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message || "Network error" }
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithProvider,
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
