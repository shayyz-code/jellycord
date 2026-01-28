export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          name: string | null
          bio: string | null
          avatar: string | null
          character: string | null
          banner: string | null
          primary_color: string | null
          links: Json | null
        }
        Insert: {
          id: string
          username?: string | null
          name?: string | null
          bio?: string | null
          avatar?: string | null
          character?: string | null
          banner?: string | null
          primary_color?: string | null
          links?: Json | null
        }
        Update: {
          id?: string
          username?: string | null
          name?: string | null
          bio?: string | null
          avatar: string | null
          character?: string | null
          banner?: string | null
          primary_color?: string | null
          links?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      statuses: {
        Row: {
          id: string
          user_id: string
          content: string | null
          mood: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content?: string | null
          mood?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string | null
          mood?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "statuses_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
