import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
    try {
        // First, try to get auth from Authorization header (for iframe contexts)
        const authHeader = request.headers.get('Authorization')

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7)

            // Verify the token directly with Supabase
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            )

            const { data: { user }, error } = await supabase.auth.getUser(token)

            if (error) {
                return NextResponse.json({
                    authenticated: false,
                    method: 'bearer_token',
                    error: error.message,
                    timestamp: new Date().toISOString(),
                }, { status: 401 })
            }

            if (user) {
                return NextResponse.json({
                    authenticated: true,
                    method: 'bearer_token',
                    userId: user.id,
                    email: user.email,
                    timestamp: new Date().toISOString(),
                })
            }
        }

        // Fallback: try to get auth from cookies (for non-iframe contexts)
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
            return NextResponse.json({
                authenticated: false,
                method: 'cookies',
                error: error.message,
                code: error.code,
                hint: 'If in iframe, pass Authorization: Bearer <token> header',
                timestamp: new Date().toISOString(),
            }, { status: 401 })
        }

        if (!user) {
            return NextResponse.json({
                authenticated: false,
                method: 'cookies',
                error: 'No user session found',
                hint: 'If in iframe, pass Authorization: Bearer <token> header',
                timestamp: new Date().toISOString(),
            }, { status: 401 })
        }

        return NextResponse.json({
            authenticated: true,
            method: 'cookies',
            userId: user.id,
            email: user.email,
            timestamp: new Date().toISOString(),
        })
    } catch (err: any) {
        return NextResponse.json({
            authenticated: false,
            error: err.message || 'Unknown error',
            timestamp: new Date().toISOString(),
        }, { status: 500 })
    }
}
