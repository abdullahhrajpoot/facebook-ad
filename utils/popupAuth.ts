'use client'

import { createClient } from './supabase/client'

const POPUP_WIDTH = 450
const POPUP_HEIGHT = 600
const BROADCAST_CHANNEL_NAME = 'ikonic_auth_channel'
const LOCALSTORAGE_AUTH_KEY = 'ikonic_popup_auth_result'

interface TokenData {
    accessToken: string
    refreshToken: string
}

interface UserData {
    id: string
    email: string
    role: string
}

interface AuthMessage {
    type: 'POPUP_AUTH_SUCCESS' | 'POPUP_AUTH_ERROR'
    accessToken?: string
    refreshToken?: string
    user?: UserData
    error?: string
    timestamp: number
    sessionId?: string
}

// Generate a unique session ID for the relay
function generateSessionId(): string {
    return 'auth_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
}

/**
 * Open a popup window for authentication
 * This bypasses iframe cookie restrictions by authenticating in a first-party context
 * 
 * Communication method: SERVER RELAY
 * - Popup sends auth to server with sessionId
 * - Iframe polls server for auth with same sessionId
 * This works because localStorage is partitioned by top-level origin in iframes
 */
export function openAuthPopup(
    onSuccess: (user: UserData, tokens: TokenData) => void,
    onError?: (error: string) => void,
    onClose?: () => void
): Window | null {
    if (typeof window === 'undefined') return null

    // Generate unique session ID for this auth attempt
    const sessionId = generateSessionId()
    console.log('[PopupAuth] Session ID:', sessionId)

    // Calculate popup position (centered)
    const left = window.screenX + (window.outerWidth - POPUP_WIDTH) / 2
    const top = window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2

    // Build popup URL with session ID for server relay
    const origin = window.location.origin
    const popupUrl = `/auth/popup-login?popup=true&origin=${encodeURIComponent(origin)}&sessionId=${sessionId}`

    console.log('[PopupAuth] Opening popup:', popupUrl)

    // Open the popup
    const popup = window.open(
        popupUrl,
        'auth_popup',
        `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},resizable=yes,scrollbars=yes,popup=yes`
    )

    if (!popup) {
        onError?.('Popup was blocked. Please allow popups for this site.')
        return null
    }

    let authReceived = false

    // Unified handler for auth messages
    const handleAuthMessage = async (data: AuthMessage, source: string) => {
        if (authReceived) return

        if (data?.type === 'POPUP_AUTH_SUCCESS' && data.accessToken && data.user) {
            authReceived = true
            console.log('[PopupAuth] ✓ Received auth success via', source, ':', data.user.email)

            const tokens: TokenData = {
                accessToken: data.accessToken,
                refreshToken: data.refreshToken!,
            }

            const user: UserData = {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role || 'user',
            }

            // Try to set the session in Supabase client (may fail in iframe)
            try {
                const supabase = createClient()
                await supabase.auth.setSession({
                    access_token: tokens.accessToken,
                    refresh_token: tokens.refreshToken,
                })
                console.log('[PopupAuth] Session set in Supabase client')
            } catch (err: any) {
                console.log('[PopupAuth] Supabase setSession failed (expected in iframe):', err.message)
            }

            // Call success with both user and tokens
            onSuccess(user, tokens)
            cleanup()
        } else if (data?.type === 'POPUP_AUTH_ERROR') {
            authReceived = true
            onError?.(data.error || 'Authentication failed')
            cleanup()
        }
    }

    // PRIMARY METHOD: Poll server relay endpoint
    let pollCount = 0
    const pollServerRelay = setInterval(async () => {
        if (authReceived) return
        pollCount++
        
        // Log every 5 polls (every 2.5 seconds)
        if (pollCount % 5 === 0) {
            console.log('[PopupAuth] Polling server relay... (poll #' + pollCount + ')')
        }

        try {
            const response = await fetch(`/api/auth/relay?sessionId=${sessionId}`)
            const result = await response.json()
            
            if (result.found && result.authData) {
                console.log('[PopupAuth] ✓ Found auth data from server relay!')
                handleAuthMessage(result.authData, 'server-relay')
            }
        } catch (err) {
            // Network error, keep polling
            if (pollCount % 10 === 0) {
                console.log('[PopupAuth] Server relay poll failed, retrying...')
            }
        }
    }, 500) // Poll every 500ms

    // FALLBACK: BroadcastChannel (may work if not partitioned)
    let broadcastChannel: BroadcastChannel | null = null
    try {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
        broadcastChannel.onmessage = (event: MessageEvent<AuthMessage>) => {
            if (authReceived) return
            handleAuthMessage(event.data, 'BroadcastChannel')
        }
        console.log('[PopupAuth] BroadcastChannel listener active (fallback)')
    } catch (err) {
        console.log('[PopupAuth] BroadcastChannel not supported')
    }

    // FALLBACK: postMessage (legacy)
    const handlePostMessage = (event: MessageEvent) => {
        if (authReceived) return
        if (event.origin !== window.location.origin) return
        if (event.data?.type === 'POPUP_AUTH_SUCCESS' || event.data?.type === 'POPUP_AUTH_ERROR') {
            handleAuthMessage(event.data as AuthMessage, 'postMessage')
        }
    }
    window.addEventListener('message', handlePostMessage)

    // Set a maximum timeout (5 minutes)
    const maxTimeout = setTimeout(() => {
        if (!authReceived) {
            console.log('[PopupAuth] Maximum timeout reached (5 minutes)')
            cleanup()
            onClose?.()
        }
    }, 5 * 60 * 1000)

    const cleanup = () => {
        window.removeEventListener('message', handlePostMessage)
        broadcastChannel?.close()
        clearInterval(pollServerRelay)
        clearTimeout(maxTimeout)
        console.log('[PopupAuth] Cleanup complete')
    }

    return popup
}

/**
 * Hook-friendly wrapper for popup auth
 */
export function usePopupAuth() {
    const openLogin = (callbacks?: {
        onSuccess?: (user: { id: string; email: string }) => void
        onError?: (error: string) => void
        onClose?: () => void
    }) => {
        return openAuthPopup(
            callbacks?.onSuccess || (() => { window.location.reload() }),
            callbacks?.onError,
            callbacks?.onClose
        )
    }

    return { openLogin }
}

// Export constants for popup-login page
export { BROADCAST_CHANNEL_NAME, LOCALSTORAGE_AUTH_KEY }
export type { AuthMessage }
