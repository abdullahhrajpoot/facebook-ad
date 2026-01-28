import { getRedis, isRedisConfigured } from './redis'

// Cache TTL configurations (in seconds)
export const CACHE_TTL = {
    // Search results: 1 hour (ads don't change that frequently)
    SEARCH_RESULTS: 60 * 60,
    
    // Page discovery results: 2 hours
    PAGE_DISCOVERY: 60 * 60 * 2,
    
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
        return null
    }

    try {
        const redis = getRedis()
        const cached = await redis.get<T>(key)
        return cached
    } catch (error) {
        console.error('[Cache] Error getting from cache:', error)
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
        return false
    }

    try {
        const redis = getRedis()
        await redis.set(key, data, { ex: ttlSeconds })
        return true
    } catch (error) {
        console.error('[Cache] Error setting cache:', error)
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
