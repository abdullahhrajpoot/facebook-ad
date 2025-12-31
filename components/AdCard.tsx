'use client'

import Link from 'next/link'

interface AdCardProps {
    ad: {
        id?: string
        title?: string
        description?: string
        imageUrl?: string
        status?: string
        impressions?: any
        clicks?: any
        spend?: any

        // Apify specific fields mapping
        adCreativeBody?: string
        adCreativeLinkTitle?: string
        pageName?: string
        publisher_platforms?: string[]
        images?: { originalImageUrl: string }[]
        videos?: { videoUrl: string, previewImageUrl: string }[]
        startDate?: string
        endDate?: string

        // New fields from robust handling
        page_name?: string
        is_active?: boolean
        start_date?: number | string
        end_date?: number | string
        adCreativeLinkUrl?: string
        snapshot?: {
            page_name?: string;
            title?: string;
            body?: { text: string };
            message?: string;
            caption?: string;
            publisher_platforms?: string[];
            images?: { original_image_url: string; resized_image_url: string }[];
            videos?: { video_preview_image_url: string }[];
            cards?: { original_image_url: string; resized_image_url: string; title?: string }[];
            link_description?: string;
            link_url?: string;
        }
    }
}

export default function AdCard({ ad }: AdCardProps) {
    // Normalize data from various Apify scraper formats
    const snapshot = ad.snapshot || {}

    // Helper to filter out template placeholders
    const cleanText = (text?: string) => {
        if (!text) return null
        if (text.includes('{{') || text.includes('}}')) return null
        return text
    }

    // Page Name (source of the ad)
    const pageName = cleanText(ad.page_name) || cleanText(ad.pageName) || cleanText(snapshot.page_name) || 'Unknown Page'

    // Title: The main bold text (Link Title or creative title)
    // If not available, we might fall back to page name or a snippet of the body
    const title = cleanText(ad.adCreativeLinkTitle) ||
        cleanText(snapshot.title) ||
        cleanText(snapshot.link_description) ||
        cleanText(snapshot.cards?.[0]?.title) || // Carousel card title
        'Sponsored Ad'

    // Description: Body text
    // Handle cases where body might be just a string or an object with text
    let descriptionRaw = snapshot.body || snapshot.message || snapshot.caption || ad.description || ad.adCreativeBody || ''
    const descriptionText = typeof descriptionRaw === 'object' && descriptionRaw !== null && 'text' in descriptionRaw
        ? descriptionRaw.text
        : (typeof descriptionRaw === 'string' ? descriptionRaw : '')

    const description = cleanText(descriptionText) || ''

    // Headline/Link hostname: Small blue text usually
    // We can use the link_url domain or just the page name here if we want to emphasize source
    let displayLink = snapshot.link_url || ad.adCreativeLinkUrl || ''
    try {
        if (displayLink) displayLink = new URL(displayLink).hostname.replace('www.', '')
    } catch (e) { /* ignore invalid urls */ }
    const subHeader = displayLink || pageName

    // Image: prioritized from root > snapshot > video > cards
    let imageUrl = ad.imageUrl || snapshot.images?.[0]?.original_image_url || snapshot.images?.[0]?.resized_image_url

    if (!imageUrl && snapshot.videos?.[0]) {
        imageUrl = snapshot.videos[0].video_preview_image_url
    }

    if (!imageUrl && snapshot.cards?.[0]) {
        imageUrl = snapshot.cards[0].original_image_url || snapshot.cards[0].resized_image_url
    }

    // Status
    let status = ad.status
    if (!status && typeof ad.is_active === 'boolean') {
        status = ad.is_active ? 'Active' : 'Ended'
    }
    if (!status) status = 'Active' // Default

    const statusColor = {
        'Active': 'text-green-400 bg-green-400/10 border-green-400/20',
        'Reviewing': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        'Paused': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        'Ended': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
        'Inactive': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    }[status] || 'text-gray-400'

    // Dates
    const formatDate = (ts: number | string | undefined) => {
        if (!ts) return null
        const timestamp = typeof ts === 'number' && ts < 10000000000 ? ts * 1000 : Number(ts)
        const date = new Date(timestamp)
        return isNaN(date.getTime()) ? null : date.toLocaleDateString()
    }

    const startDate = formatDate(ad.start_date || ad.startDate)
    const endDate = formatDate(ad.end_date || ad.endDate)

    // Metric Helper - Improved for Spend/Objects/Ranges
    const formatMetric = (metric: any) => {
        if (metric === null || metric === undefined) return null
        if (typeof metric === 'object') {
            if (metric.impressions_text) return metric.impressions_text
            if (metric.amount && metric.currency) return `${metric.currency} ${metric.amount}`
            if (metric.text) return metric.text
            // Handle Ranges (lower_bound, upper_bound)
            if (metric.lower_bound && metric.upper_bound) return `${metric.lower_bound} - ${metric.upper_bound}`
            if (metric.min && metric.max) return `${metric.min} - ${metric.max}`
            return null
        }
        return metric
    }

    const impressions = formatMetric(ad.impressions)
    const clicks = formatMetric(ad.clicks)
    const spend = formatMetric(ad.spend)
    const hasMetrics = impressions || clicks || spend

    // Publisher Platforms
    const platforms = ad.publisher_platforms || snapshot.publisher_platforms || []

    // Platform Icons Helper
    const renderPlatformIcon = (platform: string) => {
        const p = platform.toLowerCase()
        if (p.includes('facebook')) return <div key="fb" title="Facebook" className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">f</div>
        if (p.includes('instagram')) return <div key="ig" title="Instagram" className="w-4 h-4 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 text-white flex items-center justify-center text-[8px] font-bold">i</div>
        if (p.includes('messenger')) return <div key="msg" title="Messenger" className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">m</div>
        if (p.includes('audience')) return <div key="an" title="Audience Network" className="w-4 h-4 rounded-full bg-gray-600 text-white flex items-center justify-center text-[8px] font-bold">a</div>
        return null
    }

    return (
        <a href={snapshot.link_url || ad.adCreativeLinkUrl || '#'} target="_blank" rel="noopener noreferrer" className="block group h-full">
            <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 h-full flex flex-col">
                <div className="aspect-video relative overflow-hidden bg-zinc-800">
                    {imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={imageUrl}
                            alt={title || 'Ad Image'}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-zinc-800/50">
                            <span className="text-sm">No Preview</span>
                        </div>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                        {status && (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md ${statusColor}`}>
                                {status}
                            </span>
                        )}
                    </div>

                    {/* Platforms Overlay */}
                    {platforms.length > 0 && (
                        <div className="absolute top-3 left-3 flex gap-1">
                            {platforms.map((p: string) => renderPlatformIcon(p))}
                        </div>
                    )}

                    {/* Overlay Page Name on Image as well for context */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="text-white text-xs font-semibold truncate">{pageName}</div>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
                        {title}
                    </h3>

                    {subHeader && (
                        <div className="text-xs text-blue-400 mb-3 font-medium truncate">
                            {subHeader}
                        </div>
                    )}

                    {description ? (
                        <p className="text-gray-400 text-sm mb-4 line-clamp-3 flex-1 whitespace-pre-wrap">
                            {description}
                        </p>
                    ) : (
                        <div className="flex-1"></div> // Spacer to keep card height consistent if needed
                    )}

                    {/* Render Analytics if available, otherwise dates or nothing */}
                    {hasMetrics ? (
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs text-gray-500">
                            {impressions && (
                                <div className="flex items-center gap-1" title="Impressions">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    {impressions}
                                </div>
                            )}
                            {clicks && (
                                <div className="flex items-center gap-1" title="Clicks">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                                    {clicks}
                                </div>
                            )}
                            {spend && (
                                <div className="font-medium text-gray-300" title="Spend">
                                    {spend}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs text-gray-500">
                            <span>Started: {startDate || 'N/A'}</span>
                            {endDate && <span>Ended: {endDate}</span>}
                        </div>
                    )}
                </div>
            </div>
        </a>
    )
}
