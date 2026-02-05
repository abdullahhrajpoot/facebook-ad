import { Redis } from '@upstash/redis'

// Singleton Redis client
let redis: Redis | null = null
let redisInitAttempted = false

export function getRedis(): Redis {
    if (!redis) {
        const url = process.env.UPSTASH_REDIS_REST_URL
        const token = process.env.UPSTASH_REDIS_REST_TOKEN

        if (!url || !token) {
            console.error('[Redis] Missing environment variables:', {
                hasUrl: !!url,
                hasToken: !!token,
                nodeEnv: process.env.NODE_ENV,
            })
            throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
        }

        redis = new Redis({
            url,
            token,
        })

        if (!redisInitAttempted) {
            console.log('[Redis] Client initialized successfully')
            redisInitAttempted = true
        }
    }
    return redis
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
    const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL
    const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN
    const configured = hasUrl && hasToken

    if (!configured && !redisInitAttempted) {
        console.warn('[Redis] Not configured:', { hasUrl, hasToken })
        redisInitAttempted = true
    }

    return configured
}

