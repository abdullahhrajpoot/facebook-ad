'use client'

import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'

interface SearchHistoryItem {
    id: string
    keyword: string
    filters: any
    created_at: string
}

interface SearchHistoryProps {
    onSelect: (keyword: string, country: string, maxResults: number) => void
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
                    // Unique key based on keyword and country
                    const key = `${item.keyword.toLowerCase().trim()}-${item.filters?.country}`
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key)
                        uniqueHistory.push(item)
                    }
                }
            }

            setHistory(uniqueHistory.slice(0, 10))
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

    if (loading) return (
        <div className="mb-8 animate-pulse">
            <div className="h-4 w-32 bg-zinc-800 rounded mb-3"></div>
            <div className="flex flex-wrap gap-2">
                <div className="h-8 w-24 bg-zinc-800 rounded-full"></div>
                <div className="h-8 w-32 bg-zinc-800 rounded-full"></div>
                <div className="h-8 w-28 bg-zinc-800 rounded-full"></div>
            </div>
        </div>
    )

    if (history.length === 0) return (
        <div className="mb-8 text-zinc-500 text-sm">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Searches
            </h3>
            <p className="text-xs italic opacity-50 pl-6">No recent search history found.</p>
        </div>
    )

    return (
        <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Searches
            </h3>
            <div className="flex flex-wrap gap-2">
                {history.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => onSelect(item.keyword, item.filters?.country || 'US', item.filters?.maxResults || 10)}
                        className="group flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-700/50 hover:border-blue-500/50 rounded-full text-xs text-gray-300 hover:text-white hover:bg-zinc-800 transition-all"
                    >
                        <span className="font-medium text-white group-hover:text-blue-400">{item.keyword}</span>
                        <span className="text-zinc-500 border-l border-zinc-700 pl-2 ml-1">
                            {item.filters?.country || 'US'}
                        </span>
                        <span className="text-zinc-600">
                            • {formatTime(item.created_at)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    )
}
