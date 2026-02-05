import { getRedis, isRedisConfigured } from './redis'

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
    // Search results: 2 hours (ads don't change that frequently)
    SEARCH_RESULTS: 60 * 60 * 2,
    
    // Page discovery results: 2 hours
    PAGE_DISCOVERY: 60 * 60 * 3,
    
    // Feature flags: 5 minutes
    FEATURE_FLAGS: 60 * 5,
    
    // User profile: 10 minutes
    USER_PROFILE: 60 * 10,
}

/**
 * Generate a cache key for search queries
 */
export function generateSearchCacheKey(params: {
    type: 'keyword' | 'page'
    query: string
    country?: string
    maxResults: number
}): string {
    const normalized = {
        type: params.type,
        query: params.query.toLowerCase().trim(),
        country: (params.country || 'ALL').toUpperCase(),
        maxResults: params.maxResults,
    }
    return `search:${normalized.type}:${normalized.country}:${normalized.maxResults}:${normalized.query}`
}

/**
 * Generate a cache key for page discovery
 */
export function generateDiscoveryCacheKey(params: {
    keywords: string[]
    location?: string
    limit: number
}): string {
    const normalized = {
        keywords: params.keywords.map(k => k.toLowerCase().trim()).sort().join(','),
        location: (params.location || '').toLowerCase().trim(),
        limit: params.limit,
    }
    return `discovery:${normalized.limit}:${normalized.location}:${normalized.keywords}`
}

/**
 * Get cached data
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
    if (!isRedisConfigured()) {
        console.log('[Cache] Redis not configured, skipping cache', {
            hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
            hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
        })
        return null
    }

    try {
        const redis = getRedis()
        console.log('[Cache] GET attempting...', { key })
        const cached = await redis.get<T>(key)
        const found = cached !== null && cached !== undefined
        console.log('[Cache] GET result', { 
            key, 
            found,
            type: typeof cached,
            isArray: Array.isArray(cached),
            length: Array.isArray(cached) ? cached.length : 'N/A'
        })
        return cached
    } catch (error) {
        console.error('[Cache] GET Error:', {
            key,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        })
        return null
    }
}

/**
 * Set data in cache with TTL
 */
export async function setInCache<T>(
    key: string,
    data: T,
    ttlSeconds: number
): Promise<boolean> {
    if (!isRedisConfigured()) {
        console.log('[Cache] Redis not configured, skipping cache set', {
            hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
            hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN
        })
        return false
    }

    try {
        const redis = getRedis()
        const dataStr = JSON.stringify(data)
        console.log('[Cache] SET attempting...', { 
            key, 
            ttlSeconds, 
            dataSize: dataStr.length,
            dataType: typeof data,
            isArray: Array.isArray(data),
            arrayLength: Array.isArray(data) ? data.length : 'N/A'
        })
        
        const result = await redis.set(key, data, { ex: ttlSeconds })
        console.log('[Cache] SET result', { key, result, success: result === 'OK' })
        return true
    } catch (error) {
        console.error('[Cache] SET Error:', {
            key,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        })
        return false
    }
}

/**
 * Delete from cache
 */
export async function deleteFromCache(key: string): Promise<boolean> {
    if (!isRedisConfigured()) {
        return false
    }

    try {
        const redis = getRedis()
        await redis.del(key)
        return true
    } catch (error) {
        console.error('[Cache] Error deleting from cache:', error)
        return false
    }
}

/**
 * Delete all cache entries matching a pattern
 * Use with caution - can be expensive
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
    if (!isRedisConfigured()) {
        return 0
    }

    try {
        const redis = getRedis()
        const keys = await redis.keys(pattern)
        
        if (keys.length === 0) {
            return 0
        }

        // Delete in batches
        const pipeline = redis.pipeline()
        keys.forEach(key => pipeline.del(key))
        await pipeline.exec()
        
        return keys.length
    } catch (error) {
        console.error('[Cache] Error invalidating cache pattern:', error)
        return 0
    }
}

/**
 * Wrapper function for cached API calls
 * Checks cache first, calls API if not cached, then stores result
 */
export async function withCache<T>(
    cacheKey: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>,
    options?: {
        forceRefresh?: boolean
        onCacheHit?: () => void
        onCacheMiss?: () => void
    }
): Promise<{ data: T; fromCache: boolean }> {
    // Check cache first (unless force refresh)
    if (!options?.forceRefresh) {
        const cached = await getFromCache<T>(cacheKey)
        if (cached !== null) {
            options?.onCacheHit?.()
            return { data: cached, fromCache: true }
        }
    }

    options?.onCacheMiss?.()

    // Fetch fresh data
    const data = await fetchFn()

    // Store in cache (fire and forget)
    setInCache(cacheKey, data, ttlSeconds).catch(err => {
        console.error('[Cache] Failed to store in cache:', err)
    })

    return { data, fromCache: false }
}
