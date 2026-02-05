
import { createBrowserClient } from '@supabase/ssr'

// Helper to check if running in iframe - must be called at runtime, not module load
const checkIsInIframe = () => {
    if (typeof window === 'undefined') return false
    try {
        return window !== window.parent
    } catch {
        // Cross-origin iframe will throw an error
        return true
    }
}

export const createClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key) {
        console.error('Missing Supabase environment variables:')
        console.error('NEXT_PUBLIC_SUPABASE_URL:', url ? 'SET' : 'MISSING')
        console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', key ? 'SET' : 'MISSING')
    }

    // Check iframe at runtime, not module load time
    const isInIframe = checkIsInIframe()
    
    if (isInIframe) {
        console.log('🖼️ Supabase client: Running in iframe mode, using localStorage for session')
    }

    // For iframe contexts, use localStorage for session persistence
    // This bypasses third-party cookie restrictions
    return createBrowserClient(url!, key!, {
        auth: {
            // Use localStorage in iframe to avoid third-party cookie issues
            storage: isInIframe ? window.localStorage : undefined,
            // Detect session from URL (for OAuth callbacks)
            detectSessionInUrl: true,
            // Persist session
            persistSession: true,
            // Auto refresh token
            autoRefreshToken: true,
        },
        cookieOptions: {
            // These settings help with iframe cookie issues
            sameSite: 'none',
            secure: true,
        }
    })
}
