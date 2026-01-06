'use client'

import { useState } from 'react'
import Image from 'next/image'
import { normalizeAdData, AdData } from '@/utils/adValidation'
import AdPreviewModal from './AdPreviewModal'

interface AdCardProps {
    ad: any // Raw ad data from API
}

export default function AdCard({ ad: rawAd }: AdCardProps) {
    const [showPreview, setShowPreview] = useState(false)

    const ad: AdData = normalizeAdData(rawAd)

    return (
        <>
            <div className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col h-full">
                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border shadow-lg
                        ${ad.isActive
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'}
                    `}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ad.isActive ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                        {ad.isActive ? 'Active' : 'Stopped'}
                    </span>
                </div>

                {/* Image Section */}
                <div className="relative aspect-square bg-black overflow-hidden group-hover:opacity-90 transition-opacity cursor-pointer" onClick={() => setShowPreview(true)}>
                    {ad.imageUrl ? (
                        <Image
                            src={ad.imageUrl}
                            alt={ad.title || 'Ad Image'}
                            fill
                            className="object-cover transform group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                            <span className="text-zinc-600 text-xs">No Image</span>
                        </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                        <button className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 shadow-xl">
                            View Details
                        </button>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex-1 flex flex-col">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {ad.pageName?.[0]}
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-bold text-white line-clamp-1" title={ad.pageName}>
                                    {ad.pageName}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-zinc-500 font-mono">
                                        ID: {ad.adArchiveID}
                                    </span>
                                    {ad.pageLikes && ad.pageLikes > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700" title="Total Page Likes (Followers)">
                                            <svg className="w-3 h-3 text-zinc-500" fill="currentColor" viewBox="0 0 20 20">
                                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                            </svg>
                                            <span className="font-medium text-zinc-300">
                                                {new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(ad.pageLikes)}
                                            </span>
                                            <span className="text-zinc-500 hidden sm:inline">Page Likes</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text */}
                    <div className="space-y-3 mb-4 flex-1">
                        <h3 className="text-sm font-bold text-zinc-200 leading-snug line-clamp-2" title={ad.title}>
                            {ad.title}
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                            {ad.body || 'No description available'}
                        </p>

                        {/* Metrics Row */}
                        {(ad.impressionsText || ad.spend) && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {ad.impressionsText && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-300 bg-zinc-800 px-2 py-1 rounded border border-zinc-700">
                                        <svg className="w-3 h-3 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {ad.impressionsText}
                                    </span>
                                )}
                                {ad.spend && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-400/10 px-2 py-1 rounded border border-green-400/20">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {typeof ad.spend === 'object' ? `${ad.spend.currency || '$'}${ad.spend.lower_bound || '0'}-${ad.spend.upper_bound || '+'}` : ad.spend}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer Stats / Link */}
                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium bg-zinc-800/50 px-2 py-1 rounded-md">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {ad.startDate ? new Date(ad.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                            {ad.isActive && (
                                <span className="ml-1 text-green-500 font-bold">• Active</span>
                            )}
                        </div>

                        <a
                            href={ad.linkUrl}
                            target="_blank"
                            rel="noopener"
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                            title="Visit Link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <AdPreviewModal
                ad={ad}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
            />
        </>
    )
}
