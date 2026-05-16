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
          /** v1.1 — { tone, audience, channel, memo } */
          user_intent: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mode: 'quick' | 'studio'
          product_image_url?: string | null
          status?: 'pending' | 'processing' | 'done' | 'failed'
          user_intent?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          mode?: 'quick' | 'studio'
          product_image_url?: string | null
          status?: 'pending' | 'processing' | 'done' | 'failed'
          user_intent?: Json | null
          updated_at?: string
        }
      }
      generations: {
        Row: {
          id: string
          project_id: string
          type: 'analyze' | 'naming' | 'tagline' | 'description' | 'thumbnail'
          payload: Json | null
          /** v1.1 — true if user manually edited the result text */
          user_edited: boolean | null
          /** v1.1 — variant tree parent reference */
          parent_id: string | null
          /** v1.1 — user refinement string used for regeneration */
          refinement_prompt: string | null
          /** v1.1 — locked from cascade regeneration */
          locked: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          type: 'analyze' | 'naming' | 'tagline' | 'description' | 'thumbnail'
          payload?: Json | null
          user_edited?: boolean | null
          parent_id?: string | null
          refinement_prompt?: string | null
          locked?: boolean | null
          created_at?: string
        }
        Update: {
          payload?: Json | null
          user_edited?: boolean | null
          parent_id?: string | null
          refinement_prompt?: string | null
          locked?: boolean | null
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
          /** v1.1 — pinned during re-roll (Phase 2) */
          is_pinned: boolean | null
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
          is_pinned?: boolean | null
          nano_banana_request_id?: string | null
          created_at?: string
        }
        Update: {
          is_primary?: boolean
          is_pinned?: boolean | null
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
