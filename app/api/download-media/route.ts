import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getRateLimitIdentifier } from '@/utils/rateLimit'

// Whitelist of allowed domains for media downloads
const ALLOWED_DOMAINS = [
    'fbcdn.net',
    'facebook.com',
    'fb.com',
    'cdninstagram.com',
    'instagram.com',
]

function isAllowedUrl(url: string): boolean {
    try {
        const urlObj = new URL(url)
        return ALLOWED_DOMAINS.some(domain => 
            urlObj.hostname.endsWith(domain) || urlObj.hostname.includes(domain)
        )
    } catch {
        return false
    }
}

export async function POST(req: NextRequest) {
    try {
        // Authenticate - try Bearer token first (for iframe contexts), then cookies
        const supabase = await createClient()
        let user = null;

        // Check for Authorization header first (works in iframe where cookies are blocked)
        const authHeader = req.headers.get('Authorization');
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const { data, error } = await supabase.auth.getUser(token);
            if (!error && data.user) {
                user = data.user;
            }
        }

        // Fall back to cookie-based auth
        if (!user) {
            const { data: { user: cookieUser } } = await supabase.auth.getUser()
            user = cookieUser;
        }
        
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Rate limiting
        const rateLimitId = getRateLimitIdentifier(user.id, req)
        const rateLimit = await checkRateLimit(rateLimitId, 'download')
        if (!rateLimit.success) {
            return rateLimit.error
        }

        const { url, filename } = await req.json()

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 })
        }

        // Security: Only allow downloads from whitelisted domains
        if (!isAllowedUrl(url)) {
            return NextResponse.json(
                { error: 'Downloads are only allowed from Facebook and Instagram domains' },
                { status: 403 }
            )
        }

        const cleanUrl = url.replace(/&amp;/g, '&');

        const response = await fetch(cleanUrl)
        if (!response.ok) {
            throw new Error(`Failed to fetch media: ${response.statusText}`)
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream'
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Content-Disposition': `attachment; filename="${filename || 'download'}"`,
            },
        })

    } catch (error: any) {
        console.error('Download error:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to download media' },
            { status: 500 }
        )
    }
}
