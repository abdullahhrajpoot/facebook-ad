'use client'

import { useState } from 'react'
import AdPreviewModal from './AdPreviewModal'

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
        adCreativeBody?: string
        adCreativeLinkTitle?: string
        pageName?: string
        publisher_platforms?: string[]
        images?: { originalImageUrl: string }[]
        videos?: { videoUrl: string, previewImageUrl: string }[]
        startDate?: string
        endDate?: string
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
    const [showPreview, setShowPreview] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    // Normalize data
    const snapshot = ad.snapshot || {}
    const cleanText = (text?: string) => {
        if (!text) return null
        if (text.includes('{{') || text.includes('}}')) return null
        return text
    }

    const pageName = cleanText(ad.page_name) || cleanText(ad.pageName) || cleanText(snapshot.page_name) || 'Unknown Page'

    // Title Logic
    const title = cleanText(ad.adCreativeLinkTitle) ||
        cleanText(snapshot.title) ||
        cleanText(snapshot.link_description) ||
        cleanText(snapshot.cards?.[0]?.title) ||
        'Sponsored Ad'

    // Description Logic
    let descriptionRaw = snapshot.body || snapshot.message || snapshot.caption || ad.description || ad.adCreativeBody || ''
    const descriptionText = typeof descriptionRaw === 'object' && descriptionRaw !== null && 'text' in descriptionRaw
        ? descriptionRaw.text
        : (typeof descriptionRaw === 'string' ? descriptionRaw : '')
    const description = cleanText(descriptionText) || ''

    // Link Logic
    let displayLink = snapshot.link_url || ad.adCreativeLinkUrl || ''
    try {
        if (displayLink) displayLink = new URL(displayLink).hostname.replace('www.', '')
    } catch (e) { /* ignore */ }
    const subHeader = displayLink || pageName

    // Image Logic
    let imageUrl = ad.imageUrl || snapshot.images?.[0]?.original_image_url || snapshot.images?.[0]?.resized_image_url
    if (!imageUrl && snapshot.videos?.[0]) imageUrl = snapshot.videos[0].video_preview_image_url
    if (!imageUrl && snapshot.cards?.[0]) imageUrl = snapshot.cards[0].original_image_url || snapshot.cards[0].resized_image_url

    // Status Logic
    let status = ad.status
    if (!status && typeof ad.is_active === 'boolean') status = ad.is_active ? 'Active' : 'Ended'
    if (!status) status = 'Active'

    const statusColor = {
        'Active': 'text-green-400 bg-green-500/10 border-green-500/20',
        'Reviewing': 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
        'Paused': 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        'Ended': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
        'Inactive': 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    }[status] || 'text-gray-400'

    // Date Logic
    const formatDate = (ts: number | string | undefined) => {
        if (!ts) return null
        const timestamp = typeof ts === 'number' && ts < 10000000000 ? ts * 1000 : Number(ts)
        const date = new Date(timestamp)
        return isNaN(date.getTime()) ? null : date.toLocaleDateString()
    }
    const startDate = formatDate(ad.start_date || ad.startDate)
    const endDate = formatDate(ad.end_date || ad.endDate)

    // Metric Logic
    const formatMetric = (metric: any) => {
        if (metric === null || metric === undefined) return null
        if (typeof metric === 'object') {
            if (metric.impressions_text) return metric.impressions_text
            if (metric.amount && metric.currency) return `${metric.currency} ${metric.amount}`
            if (metric.text) return metric.text
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

    // Platform Icons
    const platforms: string[] = ad.publisher_platforms || snapshot.publisher_platforms || []
    const renderPlatformIcon = (platform: string) => {
        const p = platform.toLowerCase()
        if (p.includes('facebook')) return <div key="fb" title="Facebook" className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shadow-black/50">f</div>
        if (p.includes('instagram')) return <div key="ig" title="Instagram" className="w-5 h-5 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shadow-black/50">i</div>
        if (p.includes('messenger')) return <div key="msg" title="Messenger" className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shadow-black/50">m</div>
        if (p.includes('audience')) return <div key="an" title="Audience Network" className="w-5 h-5 rounded-full bg-gray-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm shadow-black/50">a</div>
        return null
    }

    return (
        <>
            <div
                onClick={() => setShowPreview(true)}
                className="block group h-full cursor-pointer"
            >
                <div className="glass-card rounded-xl overflow-hidden h-full flex flex-col group-hover:border-blue-500/50 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all duration-300 relative">
                    {/* Image Area - Aspect Video for consistency */}
                    <div className="aspect-video relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                        {imageUrl ? (
                            <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={imageUrl}
                                    alt={title || 'Ad Image'}
                                    loading="lazy"
                                    onLoad={() => setImageLoaded(true)}
                                    className={`object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                                />
                                {!imageLoaded && (
                                    <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-800/30">
                                <svg className="w-8 h-8 opacity-20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-xs font-medium opacity-50">No Preview</span>
                            </div>
                        )}

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60 pointer-events-none" />

                        {/* Top Right Status */}
                        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                            {status && (
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border backdrop-blur-md shadow-sm ${statusColor}`}>
                                    {status}
                                </span>
                            )}
                        </div>

                        {/* Top Left Platforms */}
                        {platforms.length > 0 && (
                            <div className="absolute top-3 left-3 flex gap-1 z-10">
                                {platforms.map((p: string) => renderPlatformIcon(p))}
                            </div>
                        )}

                        {/* Bottom Left Page Label */}
                        <div className="absolute bottom-2 left-3 z-10 max-w-[80%]">
                            <div className="text-white text-[10px] font-bold uppercase tracking-wider truncate py-1 px-2 bg-black/50 backdrop-blur-sm rounded-md border border-white/10">
                                {pageName}
                            </div>
                        </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col relative z-0">
                        <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors line-clamp-2 leading-tight">
                            {title}
                        </h3>

                        {subHeader && (
                            <div className="text-[11px] text-blue-400/80 mb-3 font-medium truncate uppercase tracking-wide">
                                {subHeader}
                            </div>
                        )}

                        {description ? (
                            <p className="text-zinc-400 text-xs mb-4 line-clamp-3 flex-1 whitespace-pre-wrap leading-relaxed">
                                {description}
                            </p>
                        ) : (
                            <div className="flex-1 opacity-20 text-xs text-zinc-600 italic mb-4">No text content available</div>
                        )}

                        {/* Footer Metrics/Date */}
                        <div className="pt-3 border-t border-zinc-800/50 mt-auto">
                            {hasMetrics ? (
                                <div className="flex items-center justify-between text-xs text-zinc-500">
                                    {impressions && (
                                        <div className="flex items-center gap-1.5" title="Impressions">
                                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            <span className="font-mono">{impressions}</span>
                                        </div>
                                    )}
                                    {clicks && (
                                        <div className="flex items-center gap-1.5" title="Clicks">
                                            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                                            <span className="font-mono">{clicks}</span>
                                        </div>
                                    )}
                                    {spend && (
                                        <div className="font-mono text-zinc-300 font-medium bg-zinc-800/50 px-2 py-0.5 rounded" title="Spend">
                                            {spend}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center justify-between text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                                        {startDate || 'Recent'}
                                    </div>
                                    {endDate && (
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500/50"></div>
                                            {endDate}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AdPreviewModal
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
                ad={ad}
            />
        </>
    )
}
