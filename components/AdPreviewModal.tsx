'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface AdPreviewModalProps {
    isOpen: boolean
    onClose: () => void
    ad: any // Same type as AdCard prop
}

export default function AdPreviewModal({ isOpen, onClose, ad }: AdPreviewModalProps) {
    const [mounted, setMounted] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'hidden' // Prevent background scrolling
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    // Close on backdrop click
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose()
        }
    }

    if (!mounted || !isOpen) return null

    // Reuse logic from AdCard to parse standard fields
    const snapshot = ad.snapshot || {}
    const cleanText = (text?: string) => {
        if (!text) return null
        if (text.includes('{{') || text.includes('}}')) return null
        return text
    }

    const pageName = cleanText(ad.page_name) || cleanText(ad.pageName) || cleanText(snapshot.page_name) || 'Unknown Page'

    // Title
    const title = cleanText(ad.adCreativeLinkTitle) ||
        cleanText(snapshot.title) ||
        cleanText(snapshot.link_description) ||
        cleanText(snapshot.cards?.[0]?.title) ||
        'Sponsored Ad'

    // Description (Full text)
    let descriptionRaw = snapshot.body || snapshot.message || snapshot.caption || ad.description || ad.adCreativeBody || ''
    const descriptionText = typeof descriptionRaw === 'object' && descriptionRaw !== null && 'text' in descriptionRaw
        ? descriptionRaw.text
        : (typeof descriptionRaw === 'string' ? descriptionRaw : '')
    const description = cleanText(descriptionText) || ''

    // Link
    const targetUrl = snapshot.link_url || ad.adCreativeLinkUrl || '#'

    // Image
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
    const statusColor = {
        'Active': 'text-green-400 bg-green-400/10 border-green-400/20',
        'Reviewing': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        'Paused': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        'Ended': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
        'Inactive': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    }[status as string] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'

    // Dates
    const formatDate = (ts: number | string | undefined) => {
        if (!ts) return null
        const timestamp = typeof ts === 'number' && ts < 10000000000 ? ts * 1000 : Number(ts)
        const date = new Date(timestamp)
        return isNaN(date.getTime()) ? null : date.toLocaleDateString()
    }
    const startDate = formatDate(ad.start_date || ad.startDate)
    const endDate = formatDate(ad.end_date || ad.endDate)

    // Platforms
    const platforms: string[] = ad.publisher_platforms || snapshot.publisher_platforms || []

    // Platform Icons Helper
    const renderPlatformIcon = (platform: string) => {
        const p = platform.toLowerCase()
        if (p.includes('facebook')) return <div key="fb" title="Facebook" className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">f</div>
        if (p.includes('instagram')) return <div key="ig" title="Instagram" className="w-6 h-6 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">i</div>
        if (p.includes('messenger')) return <div key="msg" title="Messenger" className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">m</div>
        if (p.includes('audience')) return <div key="an" title="Audience Network" className="w-6 h-6 rounded-full bg-gray-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">a</div>
        return null
    }

    // Metrics
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

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleBackdropClick}>
            <div
                ref={modalRef}
                className="bg-zinc-900 border border-zinc-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200"
            >
                {/* Close Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-md group"
                >
                    <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Left Side: Image/Media */}
                <div className="md:w-1/2 bg-black flex items-center justify-center p-4 min-h-[300px] relative">
                    {imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            src={imageUrl}
                            alt={title || 'Ad Preview'}
                            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
                        />
                    ) : (
                        <div className="text-zinc-500 flex flex-col items-center">
                            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>No Image Preview</span>
                        </div>
                    )}

                    {/* Platform Badges Overlay */}
                    {platforms.length > 0 && (
                        <div className="absolute bottom-4 left-4 flex gap-2">
                            {platforms.map((p: string, i: number) => (
                                <div key={i}>{renderPlatformIcon(p)}</div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Side: Details */}
                <div className="md:w-1/2 p-8 flex flex-col border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-900 relative">
                    <div className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg font-bold text-gray-300">
                                {pageName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">{pageName}</h4>
                                <div className="text-xs text-gray-500 flex gap-2">
                                    {startDate && <span>Started: {startDate}</span>}
                                    {endDate && <span>Ended: {endDate}</span>}
                                </div>
                            </div>
                            <div className="ml-auto flex gap-2">
                                {status && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                                        {status}
                                    </span>
                                )}
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-4 leading-tight">
                            {title}
                        </h2>

                        <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 mb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                                {description || 'No description available for this ad.'}
                            </p>
                        </div>

                        {/* Metrics Grid */}
                        {(impressions || clicks || spend) && (
                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 text-center">
                                    <div className="text-xs text-gray-500 mb-1">Impressions</div>
                                    <div className="text-white font-mono font-semibold">{impressions || '-'}</div>
                                </div>
                                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 text-center">
                                    <div className="text-xs text-gray-500 mb-1">Clicks</div>
                                    <div className="text-white font-mono font-semibold">{clicks || '-'}</div>
                                </div>
                                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 text-center">
                                    <div className="text-xs text-gray-500 mb-1">Spend</div>
                                    <div className="text-white font-mono font-semibold">{spend || '-'}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-800">
                        <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5"
                        >
                            <span>View Product</span>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                        <p className="text-center text-xs text-gray-600 mt-3">
                            Opens in a new tab
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
