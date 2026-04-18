/**
 * Supabase DB 타입 정의
 * 실제 배포 후: pnpm dlx supabase gen types --project-id <ID> > src/types/supabase.ts
 * 현재는 수동 정의 (Sprint 0 — Supabase 연결 전)
 */

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
      user_profiles: {
        Row: {
          id: string
          plan: 'free' | 'starter' | 'pro' | 'business'
          credits_left: number
          created_at: string
        }
        Insert: {
          id: string
          plan?: 'free' | 'starter' | 'pro' | 'business'
          credits_left?: number
          created_at?: string
        }
        Update: {
          plan?: 'free' | 'starter' | 'pro' | 'business'
          credits_left?: number
        }
      }
      projects: {
        Row: {
          id: string
          user_id: string
          mode: 'quick' | 'studio'
          product_image_url: string | null
          status: 'pending' | 'processing' | 'done' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mode: 'quick' | 'studio'
          product_image_url?: string | null
          status?: 'pending' | 'processing' | 'done' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          mode?: 'quick' | 'studio'
          product_image_url?: string | null
          status?: 'pending' | 'processing' | 'done' | 'failed'
          updated_at?: string
        }
      }
      generations: {
        Row: {
          id: string
          project_id: string
          type: 'analyze' | 'naming' | 'tagline' | 'description' | 'thumbnail'
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'analyze' | 'naming' | 'tagline' | 'description' | 'thumbnail'
          payload?: Json | null
          created_at?: string
        }
        Update: {
          payload?: Json | null
        }
      }
      thumbnails: {
        Row: {
          id: string
          project_id: string
          url: string
          width: number | null
          height: number | null
          aspect_ratio: string | null
          is_primary: boolean
          nano_banana_request_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          url: string
          width?: number | null
          height?: number | null
          aspect_ratio?: string | null
          is_primary?: boolean
          nano_banana_request_id?: string | null
          created_at?: string
        }
        Update: {
          is_primary?: boolean
        }
      }
      shares: {
        Row: {
          id: string
          project_id: string
          channel: 'sms' | 'kakao' | 'link'
          target: string | null
          short_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          channel: 'sms' | 'kakao' | 'link'
          target?: string | null
          short_url?: string | null
          created_at?: string
        }
        Update: never
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          toss_customer_key: string | null
          plan: string
          renew_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          toss_customer_key?: string | null
          plan?: string
          renew_at?: string | null
          created_at?: string
        }
        Update: {
          plan?: string
          renew_at?: string | null
        }
      }
      usage_events: {
        Row: {
          id: string
          user_id: string
          kind: string
          cost: number
          tokens_in: number
          tokens_out: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          cost?: number
          tokens_in?: number
          tokens_out?: number
          created_at?: string
        }
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

// 편의 타입 alias
export type UserProfile = Database['public']['Tables']['user_profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type Generation = Database['public']['Tables']['generations']['Row']
export type Thumbnail = Database['public']['Tables']['thumbnails']['Row']
export type Share = Database['public']['Tables']['shares']['Row']
export type UsageEvent = Database['public']['Tables']['usage_events']['Row']
