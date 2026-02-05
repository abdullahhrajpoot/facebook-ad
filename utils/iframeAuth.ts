'use client'

import { createClient } from './supabase/client'

// List of allowed parent origins for postMessage communication
// Add your GHL custom domain and common GHL domains
const ALLOWED_ORIGINS = [
    'https://app.ikonicmarketer.com',
    'https://app.gohighlevel.com',
    'https://app.msgsndr.com',
    'https://highlevel.com',
    // Add additional origins as needed
]

// Allowed origin patterns (for wildcard matching)
const ALLOWED_ORIGIN_PATTERNS = [
    /\.gohighlevel\.com$/,
    /\.highlevel\.com$/,
    /\.msgsndr\.com$/,
    /\.leadconnectorhq\.com$/,
]

interface AuthMessage {
    type: 'IFRAME_AUTH_TOKEN'
    accessToken: string
    refreshToken: string
}

/**
 * Check if the app is running inside an iframe
 */
export function isInIframe(): boolean {
    if (typeof window === 'undefined') return false
    try {
        return window.self !== window.top
    } catch {
        return true // Cross-origin iframe throws error
    }
}

/**
 * Check if an origin is allowed for postMessage communication
 */
function isOriginAllowed(origin: string): boolean {
    // Check exact match
    if (ALLOWED_ORIGINS.includes(origin)) {
        return true
    }

    // Check pattern match (for subdomains)
    try {
        const url = new URL(origin)
        return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(url.hostname))
    } catch {
        return false
    }
}

/**
 * Listen for auth tokens from parent window (for iframe use)
 * This is the fallback for browsers that block partitioned cookies (Safari/iOS)
 */
export function setupIframeAuthListener(onAuthReceived?: () => void) {
    if (typeof window === 'undefined' || !isInIframe()) return

    const handleMessage = async (event: MessageEvent) => {
        // CRITICAL: Validate origin to prevent security issues
        const isAllowedOrigin = isOriginAllowed(event.origin)

        if (!isAllowedOrigin) {
            console.warn('Rejected message from unauthorized origin:', event.origin)
            return
        }

        const data = event.data as AuthMessage
        if (data?.type !== 'IFRAME_AUTH_TOKEN') return

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.setSession({
                access_token: data.accessToken,
                refresh_token: data.refreshToken,
            })

            if (error) {
                console.error('Failed to set session from parent:', error)
                window.parent.postMessage({ type: 'IFRAME_AUTH_ERROR', error: error.message }, event.origin)
                return
            }

            // Notify parent of successful auth
            window.parent.postMessage({ type: 'IFRAME_AUTH_SUCCESS' }, event.origin)
            onAuthReceived?.()
        } catch (err) {
            console.error('Error processing auth message:', err)
        }
    }

    window.addEventListener('message', handleMessage)

    // Request token from parent (parent page needs to handle this)
    try {
        window.parent.postMessage({ type: 'IFRAME_AUTH_REQUEST' }, '*')
    } catch {
        // Ignore cross-origin errors
    }

    return () => window.removeEventListener('message', handleMessage)
}

/**
 * Send a message to the parent window
 */
export function sendMessageToParent(message: unknown, targetOrigin = '*'): void {
    if (typeof window === 'undefined') return

    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage(message, targetOrigin)
        }
    } catch (e) {
        console.warn('Unable to send message to parent window:', e)
    }
}

/**
 * Notify parent of navigation events (useful for deep linking)
 */
export function notifyParentOfNavigation(path: string): void {
    sendMessageToParent({
        type: 'IFRAME_NAVIGATION',
        path,
    })
}

/**
 * Post authentication tokens to parent window (GHL)
 * This allows the parent to cache tokens and send them back on iframe reload.
 * The parent can listen for 'IFRAME_AUTH_TOKENS' messages and store them.
 */
export function postTokensToParent(tokens: {
    accessToken: string
    refreshToken: string
    userId: string
    email: string
    role: string
}): void {
    if (!isInIframe()) return

    console.log('[IframeAuth] Posting tokens to parent window')
    sendMessageToParent({
        type: 'IFRAME_AUTH_TOKENS',
        tokens,
        timestamp: Date.now(),
    })
}

/**
 * Request tokens from parent window
 * Parent should respond with IFRAME_AUTH_TOKEN message if it has cached tokens
 */
export function requestTokensFromParent(): void {
    if (!isInIframe()) return

    console.log('[IframeAuth] Requesting tokens from parent')
    sendMessageToParent({
        type: 'IFRAME_AUTH_REQUEST',
    })
}
