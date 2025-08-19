import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a function to get the client, checking for environment variables at runtime
export const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== 'undefined') {
      // Only throw on client-side where we need the client to work
      throw new Error(
        'Missing Supabase environment variables. Please check your .env file.'
      )
    }
    // Return a mock client for SSR
    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: typeof window !== 'undefined',
      autoRefreshToken: typeof window !== 'undefined',
    },
  })
}

// Export the client for use
export const supabase = getSupabaseClient()

// Helper to create a Supabase client with custom configuration for server-side usage
export const createServerSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}