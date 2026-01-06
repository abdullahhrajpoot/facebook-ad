'use client'

import { useState, useEffect } from 'react'
import { normalizeAdData, AdData } from '@/utils/adValidation'
import AdPreviewModal from './AdPreviewModal'
import { createClient } from '@/utils/supabase/client'

interface AdCardProps {
    ad: any
    initialIsSaved?: boolean
    onToggleSave?: (newState: boolean) => void
}

export default function AdCard({ ad: rawAd, initialIsSaved = false, onToggleSave }: AdCardProps) {
    const [showPreview, setShowPreview] = useState(false)
    const [isSaved, setIsSaved] = useState(initialIsSaved)
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        setIsSaved(initialIsSaved)
    }, [initialIsSaved])

    const ad: AdData = rawAd.adArchiveID ? rawAd as AdData : normalizeAdData(rawAd)

    const primaryImage = ad.images[0] || ''
    const primaryLink = ad.links[0] || '#'
    const primaryCategory = ad.pageCategories[0] || 'Ad'

    const handleSaveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isSaving) return

        setIsSaving(true)
        const previousState = isSaved
        setIsSaved(!previousState)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setIsSaved(previousState)
                return
            }

            if (!previousState) {
                const { error } = await supabase
                    .from('saved_ads')
                    .insert({
                        user_id: user.id,
                        ad_archive_id: ad.adArchiveID,
                        ad_data: rawAd
                    })
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('saved_ads')
                    .delete()
                    .eq('ad_archive_id', ad.adArchiveID)
                    .eq('user_id', user.id)
                if (error) throw error
            }

            if (onToggleSave) onToggleSave(!previousState)

        } catch (error: any) {
            console.error('Error toggling save:', error)
            alert(`Failed to save ad: ${error.message || 'Unknown error'}`)
            setIsSaved(previousState)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <>
            <div
                className="group relative bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all duration-500 hover:shadow-2xl hover:shadow-blue-900/20 flex flex-col h-full cursor-pointer"
                onClick={() => setShowPreview(true)}
            >
                {/* Top Bar: Ad ID + Category + Status */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
                    {/* Ad ID */}
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                        </svg>
                        <span className="text-[10px] font-mono text-zinc-300 font-bold tracking-tight">
                            {ad.adArchiveID.slice(0, 12)}...
                        </span>
                    </div>

                    {/* Category + Status */}
                    <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 backdrop-blur-sm">
                            {primaryCategory}
                        </span>
                        <span className={`
                            inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold backdrop-blur-sm border shadow-lg
                            ${ad.isActive
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-zinc-800/80 text-zinc-500 border-zinc-700/50'}
                        `}>
                            <span className={`w-1 h-1 rounded-full ${ad.isActive ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`}></span>
                            {ad.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSaveToggle}
                    disabled={isSaving}
                    className="absolute top-14 right-3 z-10 p-2 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 hover:scale-110 transition-all duration-200 group/btn"
                >
                    <svg
                        className={`w-4 h-4 transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-white group-hover/btn:text-red-400'}`}
                        fill={isSaved ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isSaved ? 0 : 2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>

                {/* Image Section */}
                <div className="relative aspect-[4/5] bg-gradient-to-br from-zinc-800 to-black overflow-hidden">
                    {primaryImage ? (
                        <img
                            src={primaryImage}
                            alt={ad.title || ad.pageName}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center">
                                <svg className="w-12 h-12 text-zinc-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span className="text-zinc-600 text-xs">No Image</span>
                            </div>
                        </div>
                    )}

                    {/* Gradient Overlay for bottom readability */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none"></div>
                </div>

                {/* Bottom Section: Page Info */}
                <div className="relative p-4 bg-black">
                    <div className="flex items-center gap-3 mb-3">
                        {/* Page Profile Picture */}
                        <div className="shrink-0">
                            {ad.pageProfilePictureUrl ? (
                                <img
                                    src={ad.pageProfilePictureUrl}
                                    alt={ad.pageName}
                                    className="w-10 h-10 rounded-full border-2 border-zinc-800 object-cover"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm border-2 border-zinc-800">
                                    {ad.pageName[0]?.toUpperCase()}
                                </div>
                            )}
                        </div>

                        {/* Page Name */}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-bold text-white truncate" title={ad.pageName}>
                                {ad.pageName}
                            </h3>
                            {ad.title && (
                                <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5" title={ad.title}>
                                    {ad.title}
                                </p>
                            )}
                            <p className="text-[10px] text-zinc-600 truncate mt-0.5">
                                {ad.platforms.join(' • ')}
                            </p>
                        </div>
                    </div>

                    {/* Visit Page CTA */}
                    <a
                        href={ad.pageProfileUrl || primaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold rounded-xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:shadow-blue-500/40 hover:scale-[1.02] group/cta"
                    >
                        <span>Visit Page</span>
                        <svg className="w-4 h-4 transition-transform group-hover/cta:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </a>
                </div>

                {/* Hover Pulse Effect */}
                <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/20 rounded-2xl transition-all duration-500 pointer-events-none"></div>
            </div>

            <AdPreviewModal
                ad={ad}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
            />
        </>
    )
}
