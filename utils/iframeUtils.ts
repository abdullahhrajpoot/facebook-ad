/**
 * Utility functions for handling login in iframe contexts
 */

/**
 * Check if the app is running inside an iframe
 */
export function isInIframe(): boolean {
    if (typeof window === 'undefined') return false
    return window !== window.parent
}

/**
 * Send a message to the parent window (if in iframe)
 */
export function postMessageToParent(message: {
    type: string
    data?: any
    error?: string
}): void {
    if (typeof window === 'undefined' || !isInIframe()) return

    window.parent.postMessage(message, '*')
}

/**
 * Listen for messages from parent window
 */
export function onMessageFromParent(
    callback: (message: any) => void
): () => void {
    if (typeof window === 'undefined') return () => {}

    const handleMessage = (event: MessageEvent) => {
        callback(event.data)
    }

    window.addEventListener('message', handleMessage)

    // Return cleanup function
    return () => {
        window.removeEventListener('message', handleMessage)
    }
}

/**
 * Redirect in iframe - either navigate parent window or self
 */
export function iframeRedirect(
    path: string,
    options: { redirectParent?: boolean } = { redirectParent: false }
): void {
    if (typeof window === 'undefined') return

    const fullPath = `${window.location.origin}${path}`

    if (isInIframe() && options.redirectParent) {
        // Try to redirect parent window
        window.parent.location.href = fullPath
    } else {
        // Redirect self
        window.location.href = fullPath
    }
}

/**
 * Handle iframe authentication flow
 * Notifies parent of login status
 */
export function notifyAuthenticationComplete(
    success: boolean,
    data?: { userId?: string; role?: string; token?: string }
): void {
    postMessageToParent({
        type: 'AUTH_COMPLETE',
        data: {
            success,
            ...data,
        },
    })
}

/**
 * Allow parent window to control iframe (e.g., close it after login)
 */
export function handleParentIframeControl(): void {
    onMessageFromParent((message) => {
        if (message.type === 'CLOSE_IFRAME') {
            window.parent.postMessage({ type: 'IFRAME_CLOSED' }, '*')
            if (isInIframe() && window.frameElement) {
                // Try to remove the iframe from parent
                try {
                    window.parent.postMessage({ type: 'REMOVE_IFRAME' }, '*')
                } catch {
                    // Silently fail if parent doesn't allow it
                }
            }
        }
    })
}
