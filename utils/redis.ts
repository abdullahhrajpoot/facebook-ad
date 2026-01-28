import { Redis } from '@upstash/redis'

// Singleton Redis client
let redis: Redis | null = null

export function getRedis(): Redis {
    if (!redis) {
        const url = process.env.UPSTASH_REDIS_REST_URL
        const token = process.env.UPSTASH_REDIS_REST_TOKEN

        if (!url || !token) {
            throw new Error('Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN environment variables')
        }

        redis = new Redis({
            url,
            token,
        })
    }
    return redis
}

// Check if Redis is configured
export function isRedisConfigured(): boolean {
    return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}
