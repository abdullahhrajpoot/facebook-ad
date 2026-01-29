/**
 * Validate and sanitize URLs
 */

const ALLOWED_PROTOCOLS = ['https:', 'http:']
const RESTRICTED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254', // AWS metadata
    '::1', // IPv6 localhost
]

/**
 * Check if URL is safe to fetch (prevent SSRF attacks)
 */
export function isSafeUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString)

        // Only allow http/https
        if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
            return false
        }

        // Reject localhost and internal IPs
        const hostname = url.hostname.toLowerCase()
        if (RESTRICTED_HOSTS.includes(hostname)) {
            return false
        }

        // Reject private IP ranges
        if (isPrivateIP(hostname)) {
            return false
        }

        return true
    } catch {
        return false
    }
}

/**
 * Check if hostname is a private/internal IP
 */
function isPrivateIP(hostname: string): boolean {
    // IPv4 private ranges
    const ipv4Patterns = [
        /^10\./,                    // 10.0.0.0/8
        /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
        /^192\.168\./,              // 192.168.0.0/16
    ]

    // IPv6 private ranges
    const ipv6Patterns = [
        /^fc[0-9a-f]{2}:/i,         // Unique local
        /^fe[0-9a-f]{2}:/i,         // Link-local
    ]

    return ipv4Patterns.some(p => p.test(hostname)) || 
           ipv6Patterns.some(p => p.test(hostname))
}

/**
 * Validate redirect URL to prevent open redirects
 */
export function isSafeRedirect(path: string, origin: string): boolean {
    // Must be relative path or same origin
    if (!path) return false
    
    // Reject protocol-relative URLs (//evil.com)
    if (path.startsWith('//')) {
        return false
    }

    // Reject absolute URLs to different origins
    if (path.startsWith('http://') || path.startsWith('https://')) {
        try {
            const url = new URL(path)
            return url.origin === origin
        } catch {
            return false
        }
    }

    // Allow relative paths starting with /
    return path.startsWith('/')
}
