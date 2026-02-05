import { NextResponse } from 'next/server'
import { isRedisConfigured, getRedis } from '@/utils/redis'

export async function GET() {
    const status = {
        configured: isRedisConfigured(),
        connected: false,
        error: null as string | null,
        timestamp: new Date().toISOString(),
    }

    if (!status.configured) {
        return NextResponse.json({
            ...status,
            error: 'Redis environment variables not configured on server',
            hint: 'Check UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel Environment Variables',
        }, { status: 503 })
    }

    try {
        const redis = getRedis()
        // Try a simple ping
        await redis.set('health_check', 'ok', { ex: 10 })
        const result = await redis.get('health_check')
        status.connected = result === 'ok'
    } catch (err: any) {
        status.error = err.message || 'Unknown error connecting to Redis'
    }

    return NextResponse.json(status, {
        status: status.connected ? 200 : 503
    })
}
