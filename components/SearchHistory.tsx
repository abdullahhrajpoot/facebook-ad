'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState, useMemo } from 'react'
import { Search, MapPin, Globe, Filter, Archive, ArrowRight, LayoutGrid } from 'lucide-react'
import useFeatureFlags from '@/utils/useFeatureFlags'

export interface SearchHistoryItem {
    id: string
    keyword: string
    filters: {
        type?: 'page_discovery' | 'ad_search'
        country?: string
        location?: string
        maxResults?: number
        limit?: number
        resultsCount?: number
    }
    created_at: string
}

interface SearchHistoryProps {
    onSelect: (item: SearchHistoryItem) => void
    refreshTrigger: number
}

export default function SearchHistory({ onSelect, refreshTrigger }: SearchHistoryProps) {
    const [history, setHistory] = useState<SearchHistoryItem[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()
    const { isEnabled } = useFeatureFlags()

    useEffect(() => {
        fetchHistory()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger])

    const fetchHistory = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data, error } = await supabase
                .from('search_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            // Client-side deduplication
            const uniqueHistory: SearchHistoryItem[] = []
            const seenKeys = new Set()

            if (data) {
                for (const item of data) {
                    let type = 'ad_search_keyword'
                    if (item.filters?.type === 'page_discovery') {
                        type = 'page_discovery'
                    } else if (item.filters?.searchType === 'page') {
                        type = 'ad_search_page'
                    }

                    const location = item.filters?.location || item.filters?.country || ''
                    // Unique key based on keyword, type and location/country
                    const key = `${item.keyword.toLowerCase().trim()}-${type}-${location}`

                    if (!seenKeys.has(key)) {
                        seenKeys.add(key)
                        // Inject normalized type for UI helpers
                        item.uiType = type
                        uniqueHistory.push(item)
                    }
                }
            }

            setHistory(uniqueHistory)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)

        if (minutes < 1) return 'Just now'
        if (minutes < 60) return `${minutes}m ago`

        const hours = Math.floor(minutes / 60)
        if (hours < 24) return `${hours}h ago`

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    }

    const getTypeConfig = (type: string) => {
        if (type === 'page_discovery') return {
            label: 'Page Discovery',
            icon: LayoutGrid,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'group-hover:border-purple-500/30'
        }
        if (type === 'ad_search_page') return {
            label: 'Ad Search (Page)',
            icon: Globe,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            border: 'group-hover:border-emerald-500/30'
        }
        return {
            label: 'Keyword Search',
            icon: Search,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'group-hover:border-blue-500/30'
        }
    }

    if (loading) return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-zinc-900/40 border border-zinc-800 rounded-2xl w-full"></div>
            ))}
        </div>
    )

    if (history.length === 0) return (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <div className="mb-6 p-6 bg-zinc-900/50 rounded-full ring-1 ring-white/10">
                <Archive className="w-8 h-8 opacity-40" />
            </div>
            <p className="text-zinc-400 font-medium">No search history found</p>
            <p className="text-xs text-zinc-600 mt-1">Your recent searches will appear here</p>
        </div>
    )

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filter out Page Discovery entries if the feature is disabled */}
            {history.filter(item => {
                const isPageDiscovery = (item as any).uiType === 'page_discovery'
                // Show Page Discovery entries only if the feature is enabled
                return !isPageDiscovery || isEnabled('page_discovery')
            }).map((item: any) => {
                const type = item.uiType || 'ad_search_keyword'
                const config = getTypeConfig(type)
                const isDiscovery = type === 'page_discovery'
                const Icon = config.icon

                return (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className={`
                            group relative p-5 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl 
                            transition-all duration-300 hover:bg-zinc-900/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 cursor-pointer
                            ${config.border}
                        `}
                    >
                        {/* Header */}
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-2.5 rounded-xl ${config.bg} ${config.color} transition-colors`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900/50 px-2 py-1 rounded-full border border-white/5">
                                {formatTime(item.created_at)}
                            </span>
                        </div>

                        {/* Content */}
                        <div className="space-y-3">
                            <div>
                                <h4 className="font-bold text-lg text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all truncate pr-4">
                                    {item.keyword}
                                </h4>
                                <div className="text-xs text-zinc-500 font-medium mt-0.5">{config.label}</div>
                            </div>

                            {/* Metrics / Details */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/30 px-2.5 py-1.5 rounded-lg border border-white/5">
                                    <MapPin className="w-3 h-3 text-zinc-600" />
                                    <span>
                                        {item.filters?.location || item.filters?.country || 'Global'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-900/30 px-2.5 py-1.5 rounded-lg border border-white/5">
                                    <Filter className="w-3 h-3 text-zinc-600" />
                                    <span>
                                        Limit: {item.filters?.limit || item.filters?.maxResults || item.filters?.count || 20}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Hover Action */}
                        <div className="absolute bottom-5 right-5 opacity-0 transform translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                            <div className={`p-2 rounded-full ${config.color} bg-white/5 border border-white/10`}>
                                <ArrowRight className="w-4 h-4" />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
