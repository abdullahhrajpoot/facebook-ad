'use client'

import { useState, useEffect } from 'react'
import { AdData } from '@/utils/adValidation'

interface AdPreviewModalProps {
    ad: AdData
    isOpen: boolean
    onClose: () => void
}

export default function AdPreviewModal({ ad, isOpen, onClose }: AdPreviewModalProps) {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)

    // Combine images and videos into one media array
    const allMedia = [
        ...ad.images.map(url => ({ type: 'image' as const, url })),
        ...ad.videos.map(url => ({ type: 'video' as const, url }))
    ]

    const hasMultipleMedia = allMedia.length > 1

    // Reset index when modal opens and log media
    useEffect(() => {
        if (isOpen) {
            setCurrentMediaIndex(0)
            console.log('🎬 Media Slideshow:', {
                images: ad.images.length,
                videos: ad.videos.length,
                total: allMedia.length,
                links: ad.links.length
            })
        }
    }, [isOpen])

    const nextMedia = () => {
        setCurrentMediaIndex((prev) => (prev + 1) % allMedia.length)
    }

    const prevMedia = () => {
        setCurrentMediaIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length)
    }

    if (!isOpen) return null

    const currentMedia = allMedia[currentMediaIndex]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
            onClick={onClose}>
            <div
                className="relative w-full max-w-5xl max-h-[95vh] bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white hover:bg-red-600 hover:border-red-500 transition-all duration-200 group"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="overflow-y-auto max-h-[95vh] custom-scrollbar">
                    {/* Media Carousel Section */}
                    <div className="relative bg-black">
                        <div className="relative aspect-video bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
                            {currentMedia ? (
                                currentMedia.type === 'image' ? (
                                    <img
                                        src={currentMedia.url}
                                        alt={ad.title || ad.pageName}
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <video
                                        key={currentMedia.url}
                                        src={currentMedia.url}
                                        controls
                                        autoPlay
                                        className="w-full h-full object-contain"
                                    />
                                )
                            ) : (
                                <div className="text-zinc-600">No media available</div>
                            )}

                            {/* Navigation Arrows - Only show if multiple media */}
                            {hasMultipleMedia && (
                                <>
                                    <button
                                        onClick={prevMedia}
                                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-200 hover:scale-110 shadow-xl z-10"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={nextMedia}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-200 hover:scale-110 shadow-xl z-10"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>

                                    {/* Media Counter */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold text-white z-10">
                                        {currentMediaIndex + 1} / {allMedia.length}
                                    </div>
                                </>
                            )}

                            {/* Media Type Badge */}
                            {currentMedia && (
                                <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold text-white z-10">
                                    {currentMedia.type === 'image' ? '📷 Image' : '🎥 Video'}
                                </div>
                            )}
                        </div>

                        {/*Thumbnail Strip - Only show if multiple media */}
                        {hasMultipleMedia && (
                            <div className="flex gap-2 p-4 overflow-x-auto bg-zinc-950 border-t border-zinc-800">
                                {allMedia.map((media, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentMediaIndex(index)}
                                        className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-200 ${currentMediaIndex === index
                                                ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105'
                                                : 'border-zinc-700 hover:border-zinc-600 opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        {media.type === 'image' ? (
                                            <img src={media.url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                                                </svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div className="p-6 space-y-6">
                        {/* Page Info Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                {ad.pageProfilePictureUrl ? (
                                    <img
                                        src={ad.pageProfilePictureUrl}
                                        alt={ad.pageName}
                                        className="w-12 h-12 rounded-full border-2 border-zinc-700 object-cover"
                                    />
                                ) : (
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-lg border-2 border-zinc-700">
                                        {ad.pageName[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-lg font-bold text-white">{ad.pageName}</h2>
                                    <p className="text-sm text-zinc-500">ID: {ad.adArchiveID}</p>
                                </div>
                            </div>

                            {/* Status Badge */}
                            <span className={`
                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold backdrop-blur-sm border
                                ${ad.isActive
                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                    : 'bg-zinc-800 text-zinc-500 border-zinc-700'}
                            `}>
                                <span className={`w-2 h-2 rounded-full ${ad.isActive ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                                {ad.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-4">
                            {/* Page Likes */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Page Likes</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {ad.pageLikeCount > 0 ? ad.pageLikeCount.toLocaleString() : <span className="text-sm text-zinc-600">No likes found</span>}
                                </p>
                            </div>

                            {/* Impressions */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Impressions</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {ad.impressions || <span className="text-sm text-zinc-600">No data</span>}
                                </p>
                            </div>

                            {/* Categories */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Category</span>
                                </div>
                                <p className="text-sm font-bold text-white">
                                    {ad.pageCategories.length > 0 ? ad.pageCategories.join(', ') : 'Uncategorized'}
                                </p>
                            </div>
                        </div>

                        {/* Dates */}
                        {(ad.startDate || ad.endDate) && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Active Period</span>
                                </div>
                                <p className="text-sm font-bold text-white">
                                    {ad.startDate && new Date(ad.startDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    {ad.endDate && (
                                        <> → {new Date(ad.endDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</>
                                    )}
                                    {!ad.endDate && ad.isActive && <span className="text-green-400"> → Present</span>}
                                </p>
                            </div>
                        )}

                        {/* Ad Body/Description */}
                        {ad.body && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Ad Description</span>
                                </div>
                                <div className="prose prose-invert max-w-none">
                                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                        {ad.body}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Title (if different from body) */}
                        {ad.title && ad.title !== ad.body && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <svg className="w-4 h-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Headline</span>
                                </div>
                                <p className="text-base font-bold text-white">
                                    {ad.title}
                                </p>
                            </div>
                        )}

                        {/* Platforms */}
                        {ad.platforms.length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Platforms</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {ad.platforms.map((platform, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-lg"
                                        >
                                            {platform}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Links */}
                        {ad.links.length > 0 && (
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                    <span className="text-xs font-bold text-zinc-500 uppercase">All Links ({ad.links.length})</span>
                                </div>
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                    {ad.links.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-blue-500/50 rounded-lg text-xs text-blue-400 hover:text-blue-300 font-mono transition-all duration-200 group"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                <span className="truncate break-all">{link}</span>
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
