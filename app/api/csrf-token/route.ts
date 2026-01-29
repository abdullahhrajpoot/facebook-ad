import { NextResponse } from 'next/server'
import { generateCSRFToken, setCSRFTokenCookie } from '@/utils/csrf'

/**
 * GET /api/csrf-token
 * Returns a CSRF token for use in admin forms
 * Sets the token in an HTTP-only cookie
 */
export async function GET() {
    try {
        const token = generateCSRFToken()
        
        // Set cookie
        const response = NextResponse.json({ token })
        
        // Use Response.headers to set cookies (since we can't await cookies() in response)
        response.cookies.set('__csrf_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 // 24 hours
        })

        return response
    } catch (error) {
        console.error('CSRF token generation error:', error)
        return NextResponse.json({ error: 'Failed to generate CSRF token' }, { status: 500 })
    }
}
