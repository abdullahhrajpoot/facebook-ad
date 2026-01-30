'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './supabase/client'

interface UseAuthRedirectOptions {
    redirectTo?: 'dashboard' | 'auto' // auto = detect based on role
}

/**
 * Custom hook to redirect authenticated users away from auth pages
 * @param options Configuration for redirect behavior
 * 
 * Usage in auth pages:
 * const { isLoading } = useAuthRedirect()
 * if (isLoading) return <LoadingSpinner />
 */
export function useAuthRedirect(options: UseAuthRedirectOptions = { redirectTo: 'auto' }) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const supabase = createClient()
                const { data: { session } } = await supabase.auth.getSession()

                if (session?.user) {
                    // User is authenticated, redirect away from auth pages
                    if (options.redirectTo === 'dashboard' || options.redirectTo === 'auto') {
                        // Fetch user role to determine correct dashboard
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('role')
                            .eq('id', session.user.id)
                            .single()

                        const dashboard = profile?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                        router.push(dashboard)
                    }
                } else {
                    setIsLoading(false)
                }
            } catch (err) {
                console.error('Auth check error:', err)
                setError(err instanceof Error ? err.message : 'An error occurred')
                setIsLoading(false)
            }
        }

        checkAuth()
    }, [router, options.redirectTo])

    return { isLoading, error }
}
