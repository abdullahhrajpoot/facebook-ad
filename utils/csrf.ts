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
 */
export async function setCSRFTokenCookie(token: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
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
 * @param expectedToken - The token from cookies
 * @returns true if tokens match, false otherwise
 */
export async function validateCSRFToken(request: Request): Promise<boolean> {
    const headerToken = request.headers.get(CSRF_HEADER_NAME)
    const cookieToken = await getCSRFTokenFromCookie()

    if (!headerToken || !cookieToken) {
        return false
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
        Buffer.from(headerToken),
        Buffer.from(cookieToken)
    )
}
