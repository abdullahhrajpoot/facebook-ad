'use client'

import { useState, useEffect } from 'react'
import { AdData } from '@/utils/adValidation'
import {
    X, ChevronLeft, ChevronRight, Image as ImageIcon, Video,
    ThumbsUp, Eye, Layers, Calendar, FileText, Monitor, Link as LinkIcon,
    ExternalLink
} from 'lucide-react'

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
                    <X className="w-5 h-5" />
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
                                        <ChevronLeft className="w-6 h-6" />
                                    </button>
                                    <button
                                        onClick={nextMedia}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-200 hover:scale-110 shadow-xl z-10"
                                    >
                                        <ChevronRight className="w-6 h-6" />
                                    </button>

                                    {/* Media Counter */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md border border-white/20 rounded-full text-xs font-bold text-white z-10">
                                        {currentMediaIndex + 1} / {allMedia.length}
                                    </div>
                                </>
                            )}

                            {/* Media Type Badge */}
                            {currentMedia && (
                                <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold text-white z-10 flex items-center gap-1.5">
                                    {currentMedia.type === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                                    {currentMedia.type === 'image' ? 'Image' : 'Video'}
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
                                                <Video className="w-6 h-6 text-white" />
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
                                    <ThumbsUp className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Page Likes</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {ad.pageLikeCount > 0 ? ad.pageLikeCount.toLocaleString() : <span className="text-sm text-zinc-600">No likes found</span>}
                                </p>
                            </div>

                            {/* Impressions */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Eye className="w-4 h-4 text-green-500" />
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Impressions</span>
                                </div>
                                <p className="text-xl font-bold text-white">
                                    {ad.impressions || <span className="text-sm text-zinc-600">No data</span>}
                                </p>
                            </div>

                            {/* Categories */}
                            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <Layers className="w-4 h-4 text-purple-500" />
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
                                    <Calendar className="w-4 h-4 text-orange-500" />
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
                                    <FileText className="w-4 h-4 text-cyan-500" />
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
                                    <FileText className="w-4 h-4 text-yellow-500" />
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
                                    <Monitor className="w-4 h-4 text-pink-500" />
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
                                    <LinkIcon className="w-4 h-4 text-green-500" />
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
                                                <ExternalLink className="w-3.5 h-3.5 shrink-0 group-hover:translate-x-0.5 transition-transform" />
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
