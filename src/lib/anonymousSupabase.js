import { createClient } from "@supabase/supabase-js"

// This client sends no user login session.

export const anonymousSupabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storageKey: "command-center-ticket-submission",
        },
    }
)