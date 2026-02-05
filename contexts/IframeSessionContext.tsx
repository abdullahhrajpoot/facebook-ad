'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { isInIframe, postTokensToParent, requestTokensFromParent } from '@/utils/iframeAuth'
import { getTokens, getTokensSync, saveTokens, clearTokens, buildAuthRedirectUrl } from '@/utils/iframeTokenStorage'
import { requestStorageAccess } from '@/utils/storageAccess'
import { BROADCAST_CHANNEL_NAME, LOCALSTORAGE_AUTH_KEY, type AuthMessage } from '@/utils/popupAuth'
import { User, SupabaseClient } from '@supabase/supabase-js'

interface SessionContextType {
    user: User | null
    accessToken: string | null
    isLoading: boolean
    isInIframe: boolean
    isAuthenticated: boolean
    setSessionFromPopup: (accessToken: string, refreshToken: string, user: { id: string; email: string; role: string }) => void
    signOut: () => Promise<void>
    getAuthHeaders: () => Record<string, string>
    navigateWithAuth: (path: string) => void
    supabaseClient: SupabaseClient
}

const SessionContext = createContext<SessionContextType | null>(null)

/**
 * Session provider that handles both normal and iframe auth contexts.
 * In iframe, uses persistent token storage that survives page navigation.
 */
export function IframeSessionProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [refreshToken, setRefreshToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [inIframe, setInIframe] = useState(false)

    // Create a single supabase instance for the context
    // We use useState to keep the reference stable but allow us to recreate it if needed
    const [supabaseClient] = useState(() => createClient())

    // Initialize session from storage or Supabase
    useEffect(() => {
        const iframe = isInIframe()
        setInIframe(iframe)

        const initSession = async () => {
            console.log('[IframeSession] Initializing, inIframe:', iframe)

            if (iframe) {
                // Request tokens from parent (in case parent has cached them)
                requestTokensFromParent()

                // In iframe: try to load from persistent storage first (async with IndexedDB fallback)
                const storedTokens = await getTokens()
                if (storedTokens) {
                    console.log('[IframeSession] Found stored tokens for:', storedTokens.email)

                    // IMPORTANT: Set session on the client instance so queries work!
                    await supabaseClient.auth.setSession({
                        access_token: storedTokens.accessToken,
                        refresh_token: storedTokens.refreshToken,
                    })

                    setAccessToken(storedTokens.accessToken)
                    setRefreshToken(storedTokens.refreshToken)
                    setUser({
                        id: storedTokens.userId,
                        email: storedTokens.email,
                        role: storedTokens.role,
                        app_metadata: {},
                        user_metadata: { role: storedTokens.role },
                        aud: 'authenticated',
                        created_at: new Date().toISOString(),
                    } as User)
                    setIsLoading(false)
                    return
                }
            }

            // Try normal Supabase session (works outside iframe)
            try {
                const { data: { session } } = await supabaseClient.auth.getSession()
                if (session) {
                    console.log('[IframeSession] Found Supabase session for:', session.user.email)
                    setUser(session.user)
                    setAccessToken(session.access_token)
                    setRefreshToken(session.refresh_token)
                }
            } catch (err) {
                console.log('[IframeSession] Supabase getSession failed:', err)
            }

            setIsLoading(false)
        }

        initSession()

        // Listen for popup auth via BroadcastChannel (works across same-origin windows/iframes)
        let broadcastChannel: BroadcastChannel | null = null
        if (iframe) {
            try {
                broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
                broadcastChannel.onmessage = async (event: MessageEvent<AuthMessage>) => {
                    const data = event.data
                    if (data?.type === 'POPUP_AUTH_SUCCESS' && data.accessToken && data.user) {
                        console.log('[IframeSession] Received auth via BroadcastChannel:', data.user.email)
                        
                        // Store tokens
                        await saveTokens({
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken!,
                            userId: data.user.id,
                            email: data.user.email,
                            role: data.user.role,
                        })

                        // Set session on Supabase client
                        await supabaseClient.auth.setSession({
                            access_token: data.accessToken,
                            refresh_token: data.refreshToken!,
                        })

                        // Update state
                        setAccessToken(data.accessToken)
                        setRefreshToken(data.refreshToken!)
                        setUser({
                            id: data.user.id,
                            email: data.user.email,
                            role: data.user.role,
                            app_metadata: {},
                            user_metadata: { role: data.user.role },
                            aud: 'authenticated',
                            created_at: new Date().toISOString(),
                        } as User)

                        // Post to parent for caching
                        postTokensToParent({
                            accessToken: data.accessToken,
                            refreshToken: data.refreshToken!,
                            userId: data.user.id,
                            email: data.user.email,
                            role: data.user.role,
                        })
                    }
                }
                console.log('[IframeSession] BroadcastChannel listener active')
            } catch (err) {
                console.log('[IframeSession] BroadcastChannel not supported:', err)
            }
        }

        // Listen for auth state changes
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
            console.log('[IframeSession] Auth state changed:', event)
            if (session && !inIframe) {
                setUser(session.user)
                setAccessToken(session.access_token)
                setRefreshToken(session.refresh_token)
            } else if (event === 'SIGNED_OUT') {
                setUser(null)
                setAccessToken(null)
                setRefreshToken(null)
                // Fire and forget - we don't need to block on cleanup
                clearTokens().catch(console.error)
            }
        })

        return () => {
            subscription.unsubscribe()
            broadcastChannel?.close()
        }
    }, [supabaseClient])

    // Set session from popup auth and persist
    const setSessionFromPopup = useCallback(async (
        newAccessToken: string,
        newRefreshToken: string,
        userData: { id: string; email: string; role: string }
    ) => {
        console.log('[IframeSession] Setting session from popup:', userData.email)

        const tokenData = {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            userId: userData.id,
            email: userData.email,
            role: userData.role,
        }

        // Request storage access first (required for Safari iframes after user gesture)
        // The popup auth provides the required user gesture context
        try {
            await requestStorageAccess()
        } catch (err) {
            console.log('[IframeSession] Storage access request failed (may still work):', err)
        }

        // Save to persistent storage (tries sessionStorage → IndexedDB → memory)
        await saveTokens(tokenData)

        // Post tokens to parent window (GHL) for caching
        // Parent can send these back on iframe reload via IFRAME_AUTH_TOKEN message
        postTokensToParent(tokenData)

        // Set session on client instance
        await supabaseClient.auth.setSession({
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
        })

        // Update state
        setAccessToken(newAccessToken)
        setRefreshToken(newRefreshToken)
        setUser({
            id: userData.id,
            email: userData.email,
            role: userData.role,
            app_metadata: {},
            user_metadata: { role: userData.role },
            aud: 'authenticated',
            created_at: new Date().toISOString(),
        } as User)
    }, [supabaseClient])

    // Sign out
    const signOut = useCallback(async () => {
        setUser(null)
        setAccessToken(null)
        setRefreshToken(null)
        await clearTokens()
        try {
            await supabaseClient.auth.signOut()
        } catch (err) {
            console.log('[IframeSession] signOut error:', err)
        }
    }, [supabaseClient])

    // Get auth headers for API calls
    const getAuthHeaders = useCallback((): Record<string, string> => {
        if (accessToken) {
            return { 'Authorization': `Bearer ${accessToken}` }
        }
        return {}
    }, [accessToken])

    // Navigate with auth tokens in URL (for iframe page navigation)
    const navigateWithAuth = useCallback((path: string) => {
        if (inIframe && accessToken && refreshToken && user) {
            // Build URL with auth tokens in hash
            const url = buildAuthRedirectUrl(path, {
                accessToken,
                refreshToken,
                userId: user.id,
                email: user.email || '',
                role: (user as any).role || 'user',
            })
            console.log('[IframeSession] Navigating with auth to:', path)
            window.location.href = url
        } else {
            // Normal navigation
            window.location.href = path
        }
    }, [inIframe, accessToken, refreshToken, user])

    const isAuthenticated = !!(user && accessToken)

    return (
        <SessionContext.Provider value={{
            user,
            accessToken,
            isLoading,
            isInIframe: inIframe,
            isAuthenticated,
            setSessionFromPopup,
            signOut,
            getAuthHeaders,
            navigateWithAuth,
            supabaseClient,
        }}>
            {children}
        </SessionContext.Provider>
    )
}

/**
 * Hook to access iframe session context
 */
export function useIframeSession() {
    const context = useContext(SessionContext)
    if (!context) {
        throw new Error('useIframeSession must be used within IframeSessionProvider')
    }
    // Backward compatibility shim if needed, or just return context
    return context
}
