import { Ratelimit } from '@upstash/ratelimit'
import { getRedis, isRedisConfigured } from './redis'
import { NextResponse } from 'next/server'

// Rate limit configurations for different endpoints
export const rateLimiters = {
    // Standard API rate limit: 20 requests per 10 seconds per user
    standard: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(20, '10 s'),
        analytics: true,
        prefix: 'ratelimit:standard',
    }),

    // Search API (expensive): 10 requests per minute per user
    search: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:search',
    }),

    // Page Discovery (very expensive): 5 requests per minute per user
    discovery: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:discovery',
    }),

    // Transcription (expensive): 5 requests per minute per user
    transcribe: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:transcribe',
    }),

    // Auth endpoints: 5 requests per minute per IP (prevent brute force)
    auth: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
    }),

    // Admin endpoints: 30 requests per minute
    admin: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(30, '1 m'),
        analytics: true,
        prefix: 'ratelimit:admin',
    }),

    // Download media: 20 requests per minute per user
    download: () => new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: 'ratelimit:download',
    }),
}

export type RateLimitType = keyof typeof rateLimiters

interface RateLimitResult {
    success: boolean
    limit: number
    remaining: number
    reset: number
    error?: NextResponse
}

/**
 * Check rate limit for a given identifier and limiter type
 * @param identifier - User ID, IP address, or other unique identifier
 * @param type - Type of rate limiter to use
 * @returns Rate limit result with success status and optional error response
 */
export async function checkRateLimit(
    identifier: string,
    type: RateLimitType = 'standard'
): Promise<RateLimitResult> {
    // If Redis is not configured, allow all requests (development mode)
    if (!isRedisConfigured()) {
        console.warn('[RateLimit] Redis not configured - skipping rate limit check')
        return {
            success: true,
            limit: 999,
            remaining: 999,
            reset: Date.now() + 60000,
        }
    }

    try {
        const limiter = rateLimiters[type]()
        const { success, limit, remaining, reset } = await limiter.limit(identifier)

        if (!success) {
            const retryAfter = Math.ceil((reset - Date.now()) / 1000)
            return {
                success: false,
                limit,
                remaining,
                reset,
                error: NextResponse.json(
                    {
                        error: 'Too many requests. Please slow down.',
                        retryAfter,
                        limit,
                        remaining: 0,
                    },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': limit.toString(),
                            'X-RateLimit-Remaining': '0',
                            'X-RateLimit-Reset': reset.toString(),
                            'Retry-After': retryAfter.toString(),
                        },
                    }
                ),
            }
        }

        return { success: true, limit, remaining, reset }
    } catch (error) {
        console.error('[RateLimit] Error checking rate limit:', error)
        // On error, allow the request but log the issue
        return {
            success: true,
            limit: 999,
            remaining: 999,
            reset: Date.now() + 60000,
        }
    }
}

/**
 * Get identifier for rate limiting from request
 * Prefers user ID, falls back to IP address
 */
export function getRateLimitIdentifier(
    userId?: string | null,
    request?: Request
): string {
    if (userId) {
        return `user:${userId}`
    }

    // Try to get IP from various headers
    if (request) {
        const forwarded = request.headers.get('x-forwarded-for')
        if (forwarded) {
            return `ip:${forwarded.split(',')[0].trim()}`
        }

        const realIp = request.headers.get('x-real-ip')
        if (realIp) {
            return `ip:${realIp}`
        }
    }

    // Fallback to a generic identifier (not ideal)
    return `ip:unknown-${Date.now()}`
}
