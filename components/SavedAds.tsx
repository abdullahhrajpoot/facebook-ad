'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import AdCard from './AdCard'
import SkeletonAdCard from './SkeletonAdCard'

export default function SavedAds() {
    const [savedAds, setSavedAds] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchSavedAds()
    }, [])

    const fetchSavedAds = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('saved_ads')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })

            if (error) throw error

            if (data) {
                // Extract the original ad data 
                const ads = data.map(item => item.ad_data)
                setSavedAds(ads)
            }
        } catch (error) {
            console.error('Error fetching saved ads:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUnsave = (adArchiveID: string) => {
        // Remove from local state immediately
        setSavedAds(prev => prev.filter(ad => ad.adArchiveID !== adArchiveID))
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
                {[...Array(4)].map((_, i) => (
                    <SkeletonAdCard key={i} />
                ))}
            </div>
        )
    }

    if (savedAds.length === 0) {
        return (
            <div className="max-w-4xl mx-auto text-center py-12 sm:py-20 animate-fade-in-up px-4 sm:px-0">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-8 sm:p-12">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                        <svg className="w-8 h-8 sm:w-10 sm:h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No Saved Ads Yet</h2>
                    <p className="text-gray-400 mb-6 sm:mb-8 max-w-md mx-auto text-sm sm:text-base">
                        Save ads from the search results to build your collection of high-performing creatives.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {savedAds.map((ad, i) => (
                    <AdCard
                        key={ad.adArchiveID || i}
                        ad={ad}
                        initialIsSaved={true}
                        onToggleSave={(newState) => {
                            if (!newState) {
                                handleUnsave(ad.adArchiveID)
                            }
                        }}
                    />
                ))}
            </div>
        </div>
    )
}
