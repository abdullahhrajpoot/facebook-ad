import { Redis } from '@upstash/redis'

// Singleton Redis client
let redis: Redis | null = null

export function getRedis(): Redis {
    if (!redis) {
        const url = process.env.UPSTASH_REDIS_REST_URL
        const token = process.env.UPSTASH_REDIS_REST_TOKEN

        if (!url || !token) {
            console.error('[Redis] Missing environment variables', {
                hasUrl: !!url,
                hasToken: !!token,
                urlPrefix: url ? url.substring(0, 30) + '...' : 'MISSING'
            })
            throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
        }

        console.log('[Redis] Creating client', { 
            urlPrefix: url.substring(0, 30) + '...',
            tokenPrefix: token.substring(0, 10) + '...'
        })
        
        redis = new Redis({
            url,
            token,
        })
    }
    return redis
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
    const configured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    if (!configured) {
        console.log('[Redis] Not configured', {
            hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
            hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
        })
    }
    return configured
}
