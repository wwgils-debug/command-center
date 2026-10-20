import { createClient } from "@supabase/supabase-js"

// Read the connection settings from .env.local.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

//Report missing settings clearly.
if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase connection settings in .env.local")
}

//Share one Supabase client throughout the app
export const supabase = createClient(supabaseUrl, supabaseKey)
