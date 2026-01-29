import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getRateLimitIdentifier } from '@/utils/rateLimit'

export async function middleware(request: NextRequest) {
    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'http:') {
        return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`)
    }

    // Rate limiting for auth endpoints
    if (request.nextUrl.pathname.startsWith('/api/auth') || request.nextUrl.pathname.startsWith('/auth/login')) {
        const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        const rateLimitId = `auth:${ip}`

        try {
            const rateLimit = await checkRateLimit(rateLimitId, 'auth')
            if (!rateLimit.success) {
                return NextResponse.json(
                    { error: 'Too many authentication attempts. Please try again later.' },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.reset - Date.now()) / 1000)) } }
                )
            }
        } catch (error) {
            console.error('Rate limit check error:', error)
            // Don't block on rate limit errors, allow the request through
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/api/auth/:path*',
        '/auth/login/:path*',
        '/api/admin/:path*',
    ]
}
