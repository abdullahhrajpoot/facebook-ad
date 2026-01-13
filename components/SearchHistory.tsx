'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

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

        return date.toLocaleDateString()
    }

    const getTypeIcon = (type: string) => {
        if (type === 'page_discovery') return (
            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400" title="Page Discovery">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
        )
        if (type === 'ad_search_page') return (
            <div className="p-2 bg-green-500/10 rounded-lg text-green-400" title="Ad Search (Page Context)">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
            </div>
        )
        // Default Keyword Search
        return (
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400" title="Ad Search (Keyword)">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        )
    }

    const getTypeLabel = (type: string) => {
        if (type === 'page_discovery') return 'Page Discovery'
        if (type === 'ad_search_page') return 'Ad Search (Page)'
        return 'Ad Search (Keyword)'
    }

    if (loading) return (
        <div className="space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-zinc-800/50 rounded-xl w-full"></div>
            ))}
        </div>
    )

    if (history.length === 0) return (
        <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
            <div className="mb-4 p-4 bg-zinc-800/50 rounded-full">
                <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p className="text-sm">No recent search history found.</p>
        </div>
    )

    return (
        <div className="space-y-3">
            {history.map((item: any) => {
                const type = item.uiType || 'ad_search_keyword'
                const isDiscovery = type === 'page_discovery'
                const isPageAd = type === 'ad_search_page'

                return (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item)}
                        className="group flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 rounded-xl transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            {getTypeIcon(type)}
                            <div>
                                <h4 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {item.keyword}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                    <span className="font-medium text-zinc-400">{getTypeLabel(type)}</span>
                                    <span>•</span>
                                    {isDiscovery ? (
                                        <span>
                                            {item.filters?.location || 'Global'}
                                            <span className="opacity-50 mx-1">|</span>
                                            Limit: {item.filters?.limit || 10}
                                        </span>
                                    ) : isPageAd ? (
                                        <span>
                                            Page URL/Name
                                            <span className="opacity-50 mx-1">|</span>
                                            Limit: {item.filters?.count || item.filters?.maxResults || 20}
                                        </span>
                                    ) : (
                                        <span>
                                            {item.filters?.country || 'US'}
                                            <span className="opacity-50 mx-1">|</span>
                                            Max: {item.filters?.maxResults || 10}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-xs text-zinc-600 font-medium whitespace-nowrap">
                                {formatTime(item.created_at)}
                            </span>
                            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
