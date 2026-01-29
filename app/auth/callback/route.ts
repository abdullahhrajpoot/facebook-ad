
import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isSafeRedirect } from '@/utils/urlValidation'

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const token_hash = searchParams.get('token_hash')
    const type = searchParams.get('type') as EmailOtpType | null
    const next = searchParams.get('next') ?? '/'
    const code = searchParams.get('code')

    // Handle standard/URL fragment errors that might be passed as query params
    const errorParam = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    if (errorParam) {
        console.error('Auth Error from URL:', errorParam)
        // Don't expose full error message in URL to prevent info leakage
        return NextResponse.redirect(`${request.nextUrl.origin}/auth/auth-code-error?error=authentication_failed`)
    }

    // CRITICAL: Validate redirect URL to prevent open redirects
    if (!isSafeRedirect(next, request.nextUrl.origin)) {
        console.warn('Unsafe redirect attempt:', next)
        // Redirect to dashboard instead of following untrusted URL
        return NextResponse.redirect(`${request.nextUrl.origin}/user/dashboard`)
    }

    console.log('Auth Callback Triggered')
    console.log('Params:', {
        token_hash: token_hash ? 'found' : 'missing',
        code: code ? 'found' : 'missing',
        type,
        next: next.substring(0, 100) // Log safely
    })

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
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                    }
                },
            },
        }
    )

    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        })

        if (!error) {
            return NextResponse.redirect(`${request.nextUrl.origin}${next}`)
        } else {
            console.error('Supabase verifyOtp Error:', error)
            return NextResponse.redirect(`${request.nextUrl.origin}/auth/auth-code-error?error=verification_failed`)
        }
    }

    // Support for PKCE 'code' flow which is default in many Supabase setups now
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error) {
            return NextResponse.redirect(`${request.nextUrl.origin}${next}`)
        } else {
            console.error('Supabase exchangeCode for Session Error:', error)
            return NextResponse.redirect(`${request.nextUrl.origin}/auth/auth-code-error?error=exchange_failed`)
        }
    }

    // return the user to an error page with some instructions
    return NextResponse.redirect(`${request.nextUrl.origin}/auth/auth-code-error?error=invalid_link`)
}
