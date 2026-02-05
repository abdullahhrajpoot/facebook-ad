import { cookies } from 'next/headers'
import crypto from 'crypto'

const CSRF_COOKIE_NAME = '__csrf_token'
const CSRF_HEADER_NAME = 'x-csrf-token'

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex')
}

/**
 * Set CSRF token in response cookies
 * Uses CHIPS (Partitioned cookies) for iframe compatibility
 */
export async function setCSRFTokenCookie(token: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for iframe, 'lax' for dev
        partitioned: true, // CHIPS - allows cookie in cross-site iframes
        maxAge: 60 * 60 * 24 // 24 hours
    })
}

/**
 * Get CSRF token from cookies
 */
export async function getCSRFTokenFromCookie(): Promise<string | null> {
    const cookieStore = await cookies()
    return cookieStore.get(CSRF_COOKIE_NAME)?.value || null
}

/**
 * Validate CSRF token from request
 * @param request - The incoming request object
 * @returns true if tokens match or if using Bearer auth, false otherwise
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
    // If request has Bearer token, skip CSRF check
    // Bearer token auth is already protected against CSRF since attacker can't get the token
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
        console.log('[CSRF] Skipping validation - Bearer token present')
        return true
    }

    const headerToken = request.headers.get(CSRF_HEADER_NAME)
    const cookieToken = await getCSRFTokenFromCookie()

    console.log('[CSRF] Validating - Header:', !!headerToken, 'Cookie:', !!cookieToken)

    if (!headerToken || !cookieToken) {
        return false
    }

    // Use constant-time comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(headerToken),
            Buffer.from(cookieToken)
        )
    } catch (e) {
        // Buffer lengths don't match
        return false
    }
}
