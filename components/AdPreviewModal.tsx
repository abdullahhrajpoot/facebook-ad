'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AdData } from '@/utils/adValidation'
import { createClient } from '@/utils/supabase/client'
import {
    X, ChevronLeft, ChevronRight, Image as ImageIcon, Video,
    ThumbsUp, Eye, Layers, Calendar, FileText, Monitor, Link as LinkIcon,
    ExternalLink, Facebook, Instagram, MessageCircle, AtSign, Download, Loader2, Sparkles, Copy, Check
} from 'lucide-react'

interface AdPreviewModalProps {
    ad: AdData
    isOpen: boolean
    onClose: () => void
}

export default function AdPreviewModal({ ad, isOpen, onClose }: AdPreviewModalProps) {
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
    const [isTranscribing, setIsTranscribing] = useState(false)
    const [transcriptionText, setTranscriptionText] = useState<string | null>(null)
    const [hasCopied, setHasCopied] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)

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

    const [loadingMessage, setLoadingMessage] = useState('Initializing...')

    const handleTranscribe = async (videoUrl: string) => {
        try {
            setIsTranscribing(true)
            setTranscriptionText(null)

            // Dynamic loading messages to manage user expectations
            setLoadingMessage('Connecting...')
            const timer1 = setTimeout(() => setLoadingMessage('Downloading video...'), 1000)
            const timer2 = setTimeout(() => setLoadingMessage('Processing audio...'), 4000)
            const timer3 = setTimeout(() => setLoadingMessage('Transcribing with AI...'), 8000)

            // Get auth token to pass in header (needed for iframe contexts where cookies are blocked)
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
                },
                credentials: 'include',
                body: JSON.stringify({ videoUrl })
            })

            clearTimeout(timer1)
            clearTimeout(timer2)
            clearTimeout(timer3)

            const data = await response.json()

            if (!response.ok) throw new Error(data.error || 'Transcription failed')

            setTranscriptionText(data.text)
        } catch (error) {
            console.error('Transcription failed:', error)
            alert('Failed to transcribe video. Please try again.')
        } finally {
            setIsTranscribing(false)
            setLoadingMessage('')
        }
    }

    const handleCopyTranscript = () => {
        if (transcriptionText) {
            navigator.clipboard.writeText(transcriptionText)
            setHasCopied(true)
            setTimeout(() => setHasCopied(false), 2000)
        }
    }

    const handleDownloadTranscript = () => {
        if (!transcriptionText) return

        const blob = new Blob([transcriptionText], { type: 'text/plain' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${ad.pageName.replace(/\s+/g, '_')}_ad_transcript.txt`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    }

    const handleDownloadMedia = async (url: string, type: 'video' | 'image') => {
        try {
            setIsDownloading(true)
            const filename = `${ad.pageName.replace(/\s+/g, '_')}_${type}_${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`
            
            // Get auth token to pass in header (needed for iframe contexts where cookies are blocked)
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()

            const response = await fetch('/api/download-media', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(session?.access_token && { 'Authorization': `Bearer ${session.access_token}` })
                },
                credentials: 'include',
                body: JSON.stringify({ url, filename }),
            })

            if (!response.ok) throw new Error('Download failed')

            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = filename
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(blobUrl)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download failed:', error)
            alert('Failed to download media.')
        } finally {
            setIsDownloading(false)
        }
    }



    if (!isOpen) return null

    const currentMedia = allMedia[currentMediaIndex]

    // Portal to document.body to avoid z-index/transform stacking context issues
    if (typeof document === 'undefined') return null

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" aria-hidden="true" />

            <div
                className="relative w-full max-w-6xl h-[95vh] sm:h-[90vh] bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in z-10 flex flex-col lg:flex-row ring-1 ring-white/5"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button Mobile/Corner */}
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 p-1.5 sm:p-2 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-white hover:bg-red-600 hover:border-red-500 transition-all duration-200 group lg:bg-zinc-900"
                >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* LEFT COLUMN: Media Player */}
                <div className="h-[35vh] sm:h-[40vh] lg:h-full lg:w-3/5 bg-black relative flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-900 group/media">
                    <div className="flex-1 relative flex items-center justify-center bg-gradient-to-br from-zinc-900 to-black overflow-hidden">
                        {currentMedia ? (
                            currentMedia.type === 'image' ? (
                                <div className="relative w-full h-full flex items-center justify-center group/image">
                                    <img
                                        src={currentMedia.url}
                                        alt={ad.title || ad.pageName}
                                        className="w-full h-full object-contain"
                                        referrerPolicy="no-referrer"
                                    />
                                    {/* Image Actions Overlay */}
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center gap-4">

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (!isDownloading) handleDownloadMedia(currentMedia.url, 'image')
                                            }}
                                            disabled={isDownloading}
                                            className="p-3 bg-zinc-800 text-white rounded-full hover:bg-zinc-700 hover:scale-110 transition-all font-bold flex items-center gap-2 border border-zinc-700 disabled:opacity-50"
                                            title="Download Image"
                                        >
                                            {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                                            <span className="text-sm">{isDownloading ? 'Saving...' : 'Save'}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="relative w-full h-full">
                                    <video
                                        key={currentMedia.url}
                                        src={currentMedia.url}
                                        controls
                                        autoPlay
                                        className="w-full h-full object-contain"
                                    />
                                    {/* Video Actions Overlay (Top Right) */}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (!isDownloading) handleDownloadMedia(currentMedia.url, 'video')
                                            }}
                                            disabled={isDownloading}
                                            className="p-2.5 bg-black/60 backdrop-blur-md border border-white/10 rounded-full text-white hover:bg-white hover:text-black transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                                            title="Download Video"
                                        >
                                            {isDownloading ? (
                                                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                                            ) : (
                                                <Download className="w-5 h-5" />
                                            )}
                                            {/* Tooltip style feedback */}
                                            {isDownloading && (
                                                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap">
                                                    Downloading...
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )
                        ) : (
                            <div className="text-zinc-600">No media available</div>
                        )}

                        {/* Navigation Arrows */}
                        {hasMultipleMedia && (
                            <>
                                <button
                                    onClick={prevMedia}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-white hover:text-black transition-all duration-200 hover:scale-110 z-10 opacity-0 group-hover/media:opacity-100"
                                >
                                    <ChevronLeft className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={nextMedia}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-white hover:text-black transition-all duration-200 hover:scale-110 z-10 opacity-0 group-hover/media:opacity-100"
                                >
                                    <ChevronRight className="w-6 h-6" />
                                </button>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full text-xs font-bold text-white z-10">
                                    {currentMediaIndex + 1} / {allMedia.length}
                                </div>
                            </>
                        )}

                        {/* Media Type Badge */}
                        {currentMedia && (
                            <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-lg text-xs font-bold text-white z-10 flex items-center gap-2">
                                {currentMedia.type === 'image' ? <ImageIcon className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                                {currentMedia.type === 'image' ? 'Image' : 'Video'}
                            </div>
                        )}

                        {/* Transcribe Button Overlay on Video */}
                        {currentMedia && currentMedia.type === 'video' && !isTranscribing && !transcriptionText && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleTranscribe(currentMedia.url)
                                }}
                                className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 z-20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Sparkles className="w-4 h-4 text-yellow-300" />
                                Transcribe Audio
                            </button>
                        )}
                    </div>

                    {/* Thumbnail Strip (Bottom of Left Column) */}
                    {hasMultipleMedia && (
                        <div className="h-16 sm:h-24 bg-zinc-950 border-t border-zinc-900 flex items-center px-2 sm:px-4 gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar">
                            {allMedia.map((media, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentMediaIndex(index)}
                                    className={`shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all duration-200 relative ${currentMediaIndex === index
                                        ? 'border-blue-500 ring-2 ring-blue-500/20 opacity-100'
                                        : 'border-zinc-800 opacity-50 hover:opacity-100 hover:border-zinc-600'
                                        }`}
                                >
                                    {media.type === 'image' ? (
                                        <img src={media.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                            <Video className="w-4 h-4 sm:w-5 sm:h-5 text-white/50" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Info Stream */}
                <div className="flex-1 h-[60vh] sm:h-[55vh] lg:h-full overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col">


                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                        {/* Page Info Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 pb-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                {ad.pageProfilePictureUrl ? (
                                    <img
                                        src={ad.pageProfilePictureUrl}
                                        alt={ad.pageName}
                                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-zinc-700 object-cover"
                                        referrerPolicy="no-referrer"
                                    />
                                ) : (
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-base sm:text-lg border-2 border-zinc-700">
                                        {ad.pageName[0]?.toUpperCase()}
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-bold text-white truncate">{ad.pageName}</h2>
                                    <p className="text-xs sm:text-sm text-zinc-500 truncate">ID: {ad.adArchiveID}</p>
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
                        <div className={`grid gap-3 sm:gap-4 ${ad.impressions ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'}`}>
                            {/* Page Likes */}
                            <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                                    <ThumbsUp className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                                    <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase">Page Likes</span>
                                </div>
                                <p className="text-lg sm:text-xl font-bold text-white">
                                    {ad.pageLikeCount > 0 ? ad.pageLikeCount.toLocaleString() : <span className="text-xs sm:text-sm text-zinc-600">No likes found</span>}
                                </p>
                            </div>

                            {/* Impressions */}
                            {/* Impressions */}
                            {ad.impressions && (
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Eye className="w-4 h-4 text-green-500" />
                                        <span className="text-xs font-bold text-zinc-500 uppercase">Impressions</span>
                                    </div>
                                    <p className="text-xl font-bold text-white">
                                        {ad.impressions}
                                    </p>
                                </div>
                            )}

                            {/* Categories */}
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
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
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
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


                        {/* Video Transcript (Moved here) */}
                        {(transcriptionText || isTranscribing) && (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 relative group animate-fade-in hover:bg-white/10 transition-colors">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs font-bold text-zinc-500 uppercase">
                                            {isTranscribing ? 'Transcribing Video...' : 'Video Transcript'}
                                        </span>
                                    </div>
                                    {!isTranscribing && transcriptionText && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleCopyTranscript}
                                                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                                                title="Copy to clipboard"
                                            >
                                                {hasCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                            </button>
                                            <button
                                                onClick={handleDownloadTranscript}
                                                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"
                                                title="Download as .txt"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isTranscribing ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-3 text-zinc-500">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        <span className="text-xs font-mono">{loadingMessage}</span>
                                    </div>
                                ) : (
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar bg-black/50 p-3 rounded-lg border border-black/50">
                                        <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono">
                                            {transcriptionText}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Title (if different from body) */}
                        {ad.title && ad.title !== ad.body && (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-yellow-500" />
                                    <span className="text-xs font-bold text-zinc-500 uppercase">Headline</span>
                                </div>
                                <p className="text-base font-bold text-white">
                                    {ad.title}
                                </p>
                            </div>
                        )}

                        {/* Ad Body/Description */}
                        {ad.body && (
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:bg-white/10 transition-colors">
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

                    </div>



                    {/* Platforms */}
                    {ad.platforms.length > 0 && (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-2 mb-3">
                                <Monitor className="w-4 h-4 text-pink-500" />
                                <span className="text-xs font-bold text-zinc-500 uppercase">Platforms</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {ad.platforms.map((platform, index) => {
                                    const p = platform.toLowerCase()
                                    let icon = <Monitor className="w-4 h-4" />
                                    let style = 'bg-zinc-800 text-zinc-400 border-zinc-700'

                                    if (p.includes('facebook')) {
                                        icon = <Facebook className="w-4 h-4" />
                                        style = 'bg-[#1877F2]/10 text-[#1877F2] border-[#1877F2]/20'
                                    } else if (p.includes('instagram')) {
                                        icon = <Instagram className="w-4 h-4" />
                                        style = 'bg-[#E4405F]/10 text-[#E4405F] border-[#E4405F]/20'
                                    } else if (p.includes('messenger')) {
                                        icon = <MessageCircle className="w-4 h-4" />
                                        style = 'bg-[#00B2FF]/10 text-[#00B2FF] border-[#00B2FF]/20'
                                    } else if (p.includes('threads')) {
                                        icon = <AtSign className="w-4 h-4" />
                                        style = 'bg-white/10 text-white border-white/20'
                                    } else if (p.includes('audience') || p.includes('network')) {
                                        icon = <Monitor className="w-4 h-4" />
                                        style = 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                    }

                                    return (
                                        <span
                                            key={index}
                                            className={`px-3 py-1.5 border rounded-lg text-xs font-bold flex items-center gap-2 ${style}`}
                                        >
                                            {icon}
                                            {platform}
                                        </span>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* Links */}
                    {ad.links.length > 0 && (
                        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:bg-white/10 transition-colors">
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
        </div>,
        document.body
    )
}
