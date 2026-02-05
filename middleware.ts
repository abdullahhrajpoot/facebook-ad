import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { checkRateLimit, getRateLimitIdentifier } from '@/utils/rateLimit'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function middleware(request: NextRequest) {
    // Enforce HTTPS in production
    if (process.env.NODE_ENV === 'production' && request.nextUrl.protocol === 'http:') {
        return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`)
    }

    // Check if request is from an iframe context (indicated by sec-fetch-dest header or custom header)
    const isIframeRequest = request.headers.get('sec-fetch-dest') === 'iframe' ||
                           request.headers.get('x-iframe-mode') === 'true'

    // Check if user is authenticated on auth pages
    const isAuthPage = request.nextUrl.pathname.startsWith('/auth/login') || 
                       request.nextUrl.pathname.startsWith('/auth/forgot-password') ||
                       request.nextUrl.pathname.startsWith('/auth/reset-password')

    // Skip server-side auth redirect for iframe contexts - let client handle it
    // In iframe mode, third-party cookies may be blocked, so server can't reliably check auth
    if (isAuthPage && !isIframeRequest) {
        try {
            const cookieStore = await cookies()
            const supabase = createServerClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                {
                    cookies: {
                        getAll() {
                            return cookieStore.getAll()
                        },
                        setAll(cookiesToSet) {
                            try {
                                cookiesToSet.forEach(({ name, value, options }) => {
                                    // Allow cookies in iframes by setting SameSite=None and Secure for cross-origin access
                                    const modifiedOptions = {
                                        ...options,
                                        sameSite: 'none' as const,
                                        secure: true,
                                    }
                                    cookieStore.set(name, value, modifiedOptions)
                                })
                            } catch {
                                // Ignore cookie setting errors in middleware
                            }
                        },
                    },
                }
            )

            const { data: { session } } = await supabase.auth.getSession()

            if (session?.user) {
                // User is logged in, redirect to dashboard
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', session.user.id)
                    .single()

                const dashboard = profile?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                return NextResponse.redirect(new URL(dashboard, request.url))
            }
        } catch (error) {
            console.error('Auth check error in middleware:', error)
            // Continue if there's an error, don't block
        }
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
        '/auth/login',
        '/auth/forgot-password',
        '/auth/reset-password',
        '/api/admin/:path*',
    ]
}
