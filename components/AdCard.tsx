'use client'
import Image from 'next/image'

import { useState, useEffect } from 'react'
import { normalizeAdData, AdData } from '@/utils/adValidation'
import AdPreviewModal from './AdPreviewModal'
import { createClient } from '@/utils/supabase/client'
import { Heart, ExternalLink, Zap, ImageOff, Layers } from 'lucide-react'

interface AdCardProps {
    ad: any
    initialIsSaved?: boolean
    onToggleSave?: (newState: boolean) => void
    variant?: 'blue' | 'emerald' | 'purple'
}

export default function AdCard({ ad: rawAd, initialIsSaved = false, onToggleSave, variant = 'blue' }: AdCardProps) {
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

    // Theme Config based on variant
    const theme = {
        blue: {
            borderHover: 'hover:border-blue-500/50',
            shadowHover: 'hover:shadow-blue-900/20',
            iconColor: 'text-blue-400',
            badgeBg: 'bg-blue-500',
            ctaBorder: 'hover:border-blue-500/50',
            ctaBg: 'hover:bg-blue-600/10',
            ctaText: 'hover:text-blue-400',
            placeholderGradient: 'from-blue-600 to-indigo-600'
        },
        emerald: {
            borderHover: 'hover:border-emerald-500/50',
            shadowHover: 'hover:shadow-emerald-900/20',
            iconColor: 'text-emerald-400',
            badgeBg: 'bg-emerald-500',
            ctaBorder: 'hover:border-emerald-500/50',
            ctaBg: 'hover:bg-emerald-600/10',
            ctaText: 'hover:text-emerald-400',
            placeholderGradient: 'from-emerald-600 to-teal-600'
        },
        purple: {
            borderHover: 'hover:border-purple-500/50',
            shadowHover: 'hover:shadow-purple-900/20',
            iconColor: 'text-purple-400',
            badgeBg: 'bg-purple-500',
            ctaBorder: 'hover:border-purple-500/50',
            ctaBg: 'hover:bg-purple-600/10',
            ctaText: 'hover:text-purple-400',
            placeholderGradient: 'from-purple-600 to-fuchsia-600'
        }
    }[variant]

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
                className={`
                    group relative bg-black/40 backdrop-blur-xl border border-white/5 
                    rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-2xl flex flex-col h-full cursor-pointer
                    hover:-translate-y-1 ring-1 ring-white/10 ${theme.borderHover} ${theme.shadowHover}
                `}
                onClick={() => setShowPreview(true)}
            >
                {/* Top Bar: Ad ID + Category + Status */}
                <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none">
                    {/* Ad ID & Category */}
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                            <Layers className={`w-3 h-3 ${theme.iconColor}`} />
                            <span className="text-[10px] font-mono text-zinc-300 font-bold tracking-tight uppercase truncate max-w-[80px]">
                                {primaryCategory}
                            </span>
                        </div>
                    </div>

                    {/* Status Toggle */}
                    <div className={`
                        pointer-events-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm border shadow-lg
                        ${ad.isActive
                            ? 'bg-green-500/20 text-green-400 border-green-500/30'
                            : 'bg-zinc-800/80 text-zinc-500 border-zinc-700/50'}
                    `}>
                        {ad.isActive ? <Zap className="w-3 h-3 fill-current" /> : <div className="w-2 h-2 rounded-full bg-zinc-500" />}
                        {ad.isActive ? 'Active' : 'Inactive'}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSaveToggle}
                    disabled={isSaving}
                    className="absolute top-14 right-3 z-20 p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/80 hover:scale-110 transition-all duration-200 group/btn"
                >
                    <Heart
                        className={`w-4 h-4 transition-all ${isSaved ? 'text-red-500 fill-red-500 scale-110' : 'text-white group-hover/btn:text-red-400'}`}
                    />
                </button>

                {/* Image Section */}
                <div className="relative aspect-[4/5] bg-zinc-900 overflow-hidden">
                    {primaryImage ? (
                        <Image
                            src={primaryImage}
                            alt={ad.title || ad.pageName}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover transform group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-800/50">
                            <div className="flex flex-col items-center gap-2 text-zinc-600">
                                <ImageOff className="w-8 h-8 opacity-50" />
                                <span className="text-xs font-bold">No Image</span>
                            </div>
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none"></div>
                </div>

                {/* Bottom Section: Page Info */}
                <div className="relative p-4 bg-black flex-1 flex flex-col justify-end">
                    <div className="flex items-center gap-3 mb-4">
                        {/* Page Profile Picture */}
                        <div className="shrink-0 relative">
                            {ad.pageProfilePictureUrl ? (
                                <Image
                                    src={ad.pageProfilePictureUrl}
                                    alt={ad.pageName}
                                    width={40}
                                    height={40}
                                    className="rounded-full border-2 border-zinc-800 object-cover bg-zinc-800"
                                />
                            ) : (
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${theme.placeholderGradient} flex items-center justify-center text-white font-bold text-sm border-2 border-zinc-800`}>
                                    {ad.pageName[0]?.toUpperCase()}
                                </div>
                            )}
                            {/* Platform Badge (Small) */}
                            {ad.platforms[0] && (
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                                    <div className={`w-2 h-2 rounded-full ${theme.badgeBg}`} />
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
                        </div>
                    </div>

                    {/* Visit Page CTA */}
                    <a
                        href={ad.pageProfileUrl || primaryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className={`
                            flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-zinc-900 border border-zinc-800 
                            text-zinc-300 text-xs font-bold rounded-xl transition-all duration-200 group/cta
                            ${theme.ctaBorder} ${theme.ctaBg} ${theme.ctaText}
                        `}
                    >
                        <span>View Details</span>
                        <ExternalLink className="w-3 h-3 transition-transform group-hover/cta:translate-x-0.5" />
                    </a>
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
