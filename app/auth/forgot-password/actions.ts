'use server'

import { createClient } from '@supabase/supabase-js'

export async function checkEmail(email: string) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        // If the key is missing (e.g. on client side accidentally or not set), we can't verify.
        // Returning true would allow the attempt (standard behavior), 
        // Returning false blocks it.
        // Given the requirement "no bullshit", we should probably log error and return false or handle it.
        console.error('SERVER ERROR: SUPABASE_SERVICE_ROLE_KEY is not defined. Cannot verify email existence.')
        return false
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey
    )

    // Check profiles table which mirrors auth users in this app
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('email', email)

    if (error) {
        console.error('Supabase Error checking email:', error)
        return false
    }

    return count !== null && count > 0
}
