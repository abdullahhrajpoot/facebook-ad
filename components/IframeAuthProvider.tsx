'use client'

import { useEffect, useState, useCallback } from 'react'
import { isInIframe, setupIframeAuthListener } from '@/utils/iframeAuth'
import { getTokens } from '@/utils/iframeTokenStorage'
import { createClient } from '@/utils/supabase/client'

interface IframeAuthProviderProps {
    children: React.ReactNode
    /** Optional loading UI while checking auth in iframe */
    fallbackUI?: React.ReactNode
    /** Timeout in ms to wait for postMessage auth (default: 3000) */
    authTimeout?: number
}

/**
 * Provider component that handles iframe authentication
 * 
 * Flow:
 * 1. Check if running in iframe
 * 2. If in iframe:
 *    a. Try to get session via cookies (CHIPS - works if supported)
 *    b. Try to load from persistent token storage (sessionStorage/IndexedDB)
 *    c. Wait for postMessage auth token from parent
 * 3. After timeout, show app anyway (user can log in manually)
 */
export function IframeAuthProvider({
    children,
    fallbackUI,
    authTimeout = 3000
}: IframeAuthProviderProps) {
    const [isReady, setIsReady] = useState(false)
    const [isIframe, setIsIframe] = useState(false)
    const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking')

    const handleAuthReceived = useCallback(() => {
        setAuthStatus('authenticated')
        setIsReady(true)
    }, [])

    useEffect(() => {
        const inIframe = isInIframe()
        setIsIframe(inIframe)

        // Not in iframe - render immediately
        if (!inIframe) {
            setIsReady(true)
            setAuthStatus('unauthenticated')
            return
        }

        // In iframe - check for existing session through multiple methods
        const checkExistingSession = async () => {
            // Method 1: Try Supabase cookies (CHIPS should work in modern browsers)
            try {
                const supabase = createClient()
                const { data: { session } } = await supabase.auth.getSession()

                if (session) {
                    console.log('[IframeAuthProvider] Found session via cookies')
                    setAuthStatus('authenticated')
                    setIsReady(true)
                    return true
                }
            } catch (err) {
                console.log('[IframeAuthProvider] Cookie session check failed:', err)
            }

            // Method 2: Try persistent token storage (sessionStorage/IndexedDB/memory)
            try {
                const storedTokens = await getTokens()
                if (storedTokens) {
                    console.log('[IframeAuthProvider] Found session via token storage')
                    setAuthStatus('authenticated')
                    setIsReady(true)
                    return true
                }
            } catch (err) {
                console.log('[IframeAuthProvider] Token storage check failed:', err)
            }

            return false
        }

        checkExistingSession().then((hasSession) => {
            if (hasSession) return

            // No session via cookies or storage, try postMessage fallback
            console.log('[IframeAuthProvider] No stored session, waiting for postMessage...')
            const cleanup = setupIframeAuthListener(handleAuthReceived)

            // Timeout: if no auth received, show app anyway
            const timeout = setTimeout(() => {
                setAuthStatus('unauthenticated')
                setIsReady(true)
            }, authTimeout)

            return () => {
                cleanup?.()
                clearTimeout(timeout)
            }
        })
    }, [authTimeout, handleAuthReceived])

    // Show loading while checking auth in iframe
    if (!isReady && isIframe) {
        return (
            <>
                {fallbackUI || (
                    <div className="flex items-center justify-center h-screen bg-zinc-950">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-zinc-400 text-sm">Loading...</span>
                        </div>
                    </div>
                )}
            </>
        )
    }

    return <>{children}</>
}

/**
 * Hook to check if app is running in an iframe
 */
export function useIsInIframe(): boolean {
    const [inIframe, setInIframe] = useState(false)

    useEffect(() => {
        setInIframe(isInIframe())
    }, [])

    return inIframe
}
