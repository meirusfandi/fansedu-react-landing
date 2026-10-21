import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

let supabaseClient: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return supabaseClient
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
