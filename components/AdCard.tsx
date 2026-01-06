'use client'

import { useState, useEffect } from 'react'
import { normalizeAdData, AdData } from '@/utils/adValidation'
import AdPreviewModal from './AdPreviewModal'
import { createClient } from '@/utils/supabase/client'

interface AdCardProps {
    ad: any // Raw ad data from API
    initialIsSaved?: boolean
    onToggleSave?: (newState: boolean) => void
}

export default function AdCard({ ad: rawAd, initialIsSaved = false, onToggleSave }: AdCardProps) {
    const [showPreview, setShowPreview] = useState(false)
    const [isSaved, setIsSaved] = useState(initialIsSaved)
    const [isSaving, setIsSaving] = useState(false)
    const supabase = createClient()

    // Sync internal state if prop changes (important for search results that might update later)
    useEffect(() => {
        setIsSaved(initialIsSaved)
    }, [initialIsSaved])

    const ad: AdData = normalizeAdData(rawAd)

    const handleSaveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isSaving) return

        setIsSaving(true)
        const previousState = isSaved
        // Optimistic update
        setIsSaved(!previousState)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                // Determine what to do if not logged in - for now revert
                setIsSaved(previousState)
                return
            }

            if (!previousState) {
                // Save the ad
                const { error } = await supabase
                    .from('saved_ads')
                    .insert({
                        user_id: user.id,
                        ad_archive_id: ad.adArchiveID,
                        ad_data: rawAd
                    })
                if (error) throw error
            } else {
                // Unsave the ad
                const { error } = await supabase
                    .from('saved_ads')
                    .delete()
                    .eq('ad_archive_id', ad.adArchiveID)
                    .eq('user_id', user.id)
                if (error) throw error
            }

            // Notify parent if needed
            if (onToggleSave) onToggleSave(!previousState)

        } catch (error: any) {
            console.error('Error toggling save:', error)
            // Revert on error
            alert(`Failed to save ad: ${error.message || 'Unknown error'}`)
            setIsSaved(previousState)
        } finally {
            setIsSaving(false)
        }
    }

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

                {/* Save Button */}
                <button
                    onClick={handleSaveToggle}
                    disabled={isSaving}
                    className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-black/70 hover:scale-110 transition-all duration-200 group/btn"
                >
                    <svg
                        className={`w-5 h-5 transition-colors ${isSaved ? 'text-red-500 fill-red-500' : 'text-white group-hover/btn:text-red-400'}`}
                        fill={isSaved ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={isSaved ? 0 : 2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>

                {/* Image Section */}
                <div className="relative aspect-square bg-black overflow-hidden group-hover:opacity-90 transition-opacity cursor-pointer" onClick={() => setShowPreview(true)}>
                    {ad.imageUrl ? (
                        <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
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
                                <span className="text-[10px] text-zinc-500 font-mono">
                                    ID: {ad.adArchiveID}
                                </span>
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
                    </div>

                    {/* Footer Stats / Link */}
                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium bg-zinc-800/50 px-2 py-1 rounded-md">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {ad.startDate ? new Date(ad.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}
                            {ad.endDate && ` - ${new Date(ad.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
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
