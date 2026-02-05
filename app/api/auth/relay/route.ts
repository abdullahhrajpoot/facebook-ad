'use server'

import { NextRequest, NextResponse } from 'next/server'

// In-memory store for auth relay (tokens expire after 5 minutes)
// In production, you'd use Redis, but this works for now
const authRelayStore = new Map<string, { data: any; expires: number }>()

// Cleanup expired entries every minute
setInterval(() => {
    const now = Date.now()
    for (const [key, value] of authRelayStore.entries()) {
        if (value.expires < now) {
            authRelayStore.delete(key)
        }
    }
}, 60000)

/**
 * POST: Store auth data for relay
 * Body: { sessionId: string, authData: object }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { sessionId, authData } = body

        if (!sessionId || !authData) {
            return NextResponse.json({ error: 'Missing sessionId or authData' }, { status: 400 })
        }

        // Store with 5 minute expiration
        authRelayStore.set(sessionId, {
            data: authData,
            expires: Date.now() + 5 * 60 * 1000
        })

        console.log('[AuthRelay] Stored auth for session:', sessionId)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[AuthRelay] POST error:', error)
        return NextResponse.json({ error: 'Failed to store auth' }, { status: 500 })
    }
}

/**
 * GET: Retrieve and delete auth data
 * Query: ?sessionId=xxx
 */
export async function GET(request: NextRequest) {
    try {
        const sessionId = request.nextUrl.searchParams.get('sessionId')

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
        }

        const entry = authRelayStore.get(sessionId)

        if (!entry) {
            return NextResponse.json({ found: false })
        }

        // Check if expired
        if (entry.expires < Date.now()) {
            authRelayStore.delete(sessionId)
            return NextResponse.json({ found: false })
        }

        // Delete after retrieval (one-time use)
        authRelayStore.delete(sessionId)

        console.log('[AuthRelay] Retrieved auth for session:', sessionId)

        return NextResponse.json({ found: true, authData: entry.data })
    } catch (error) {
        console.error('[AuthRelay] GET error:', error)
        return NextResponse.json({ error: 'Failed to retrieve auth' }, { status: 500 })
    }
}
