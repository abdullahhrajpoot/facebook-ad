'use client'

import React, { useState, useMemo } from 'react'
import AdCard from './AdCard'
import SkeletonAdCard from './SkeletonAdCard'
import { validateAd } from '@/utils/adValidation'

import { createClient } from '@/utils/supabase/client'

export default function SearchAds() {
    const [keyword, setKeyword] = useState('')
    const [country, setCountry] = useState('US')
    const [maxResults, setMaxResults] = useState('10')
    const [ads, setAds] = useState<any[]>([])
    const [savedAdIds, setSavedAdIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchMode, setSearchMode] = useState<'keyword' | 'page'>('keyword')

    const supabase = createClient()

    // Fetch saved ads on mount
    React.useEffect(() => {
        const fetchSavedAds = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('saved_ads')
                .select('ad_archive_id')
                .eq('user_id', user.id)

            if (data) {
                setSavedAdIds(new Set(data.map(item => item.ad_archive_id)))
            }
        }
        fetchSavedAds()
    }, [])

    // New Filters State
    const [activeOnly, setActiveOnly] = useState(false)
    const [minDaysActive, setMinDaysActive] = useState<number>(0)
    const [sortBy, setSortBy] = useState<'longest_running' | 'recent' | 'none'>('recent')

    const countries = [
        { code: 'US', name: 'United States' },
        { code: 'CA', name: 'Canada' },
        { code: 'GB', name: 'United Kingdom' },
        { code: 'AU', name: 'Australia' },
        { code: 'DE', name: 'Germany' },
        { code: 'FR', name: 'France' },
        { code: 'BR', name: 'Brazil' },
        { code: 'IN', name: 'India' },
        { code: 'ALL', name: 'Global' },
    ]

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!keyword.trim()) return

        setLoading(true)
        setError(null)
        setHasSearched(true)
        setAds([])

        try {
            const endpoint = searchMode === 'keyword' ? '/api/ads/search' : '/api/ads/search-page'
            const body = searchMode === 'keyword'
                ? {
                    keyword,
                    country: country === 'ALL' ? undefined : country,
                    maxResults: Number(maxResults)
                }
                : {
                    pageNameOrUrl: keyword,
                    count: Number(maxResults)
                }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to fetch ads')

            // Strict Validation Filtering
            const validAds = Array.isArray(data) ? data.filter(validateAd) : []

            if (validAds.length === 0 && Array.isArray(data) && data.length > 0) {
                setError(`Found ${data.length} raw ads, but 0 passed quality filters (missing images/links).`)
            }

            setAds(validAds)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Client-side Filtering & Sorting
    const filteredAds = useMemo(() => {
        let result = [...ads]

        // 1. Status Filter
        if (activeOnly) {
            result = result.filter(ad => ad.is_active)
        }

        // 2. Duration Filter
        if (minDaysActive > 0) {
            const now = new Date().getTime()
            result = result.filter(ad => {
                const startDate = ad.start_date || ad.startDate
                if (!startDate) return false

                let startMs = 0
                // Handle different date formats
                if (typeof startDate === 'number') {
                    // Check if seconds (10 digits) or milliseconds (13 digits)
                    startMs = startDate < 10000000000 ? startDate * 1000 : startDate
                } else if (typeof startDate === 'string' && !isNaN(Number(startDate)) && !startDate.includes('-')) {
                    // Numeric string
                    const num = Number(startDate)
                    startMs = num < 10000000000 ? num * 1000 : num
                } else {
                    // Date string (YYYY-MM-DD)
                    startMs = new Date(startDate).getTime()
                }

                if (!startMs || isNaN(startMs)) return false

                const diffTime = Math.abs(now - startMs)
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

                return diffDays >= minDaysActive
            })
        }

        // 3. Sorting
        if (sortBy === 'longest_running') {
            result.sort((a, b) => {
                const dateA = a.start_date || a.startDate ? new Date(a.start_date || a.startDate).getTime() : 0
                const dateB = b.start_date || b.startDate ? new Date(b.start_date || b.startDate).getTime() : 0
                return dateA - dateB // Ascending start date = older = running longer
            })
        } else if (sortBy === 'recent') {
            result.sort((a, b) => {
                const dateA = a.start_date || a.startDate ? new Date(a.start_date || a.startDate).getTime() : 0
                const dateB = b.start_date || b.startDate ? new Date(b.start_date || b.startDate).getTime() : 0
                return dateB - dateA // Descending start date = newer
            })
        }

        return result
    }, [ads, activeOnly, minDaysActive, sortBy])


    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Search Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl">
                {/* Search Mode Toggle */}
                <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-zinc-800 w-fit mb-6">
                    <button
                        onClick={() => setSearchMode('keyword')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'keyword' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Keyword Search
                    </button>
                    <button
                        onClick={() => setSearchMode('page')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${searchMode === 'page' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Search by Page
                    </button>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder={searchMode === 'keyword' ? "Search brands, keywords (e.g. 'Nike', 'Skincare')..." : "Enter Page Name or URL (e.g. 'ZapierApp', 'https://facebook.com/ZapierApp')"}
                            className="w-full pl-12 pr-4 py-4 bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all shadow-inner"
                        />
                    </div>

                    <div className="flex gap-4">
                        {searchMode === 'keyword' && (
                            <div className="relative min-w-[140px]">
                                <select
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full appearance-none bg-black border border-zinc-800 text-white py-4 px-4 pr-8 rounded-xl focus:outline-none focus:border-blue-600 cursor-pointer"
                                >
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        <div className="relative min-w-[100px]">
                            <select
                                value={maxResults}
                                onChange={(e) => setMaxResults(e.target.value)}
                                className="w-full appearance-none bg-black border border-zinc-800 text-white py-4 px-4 pr-8 rounded-xl focus:outline-none focus:border-blue-600 cursor-pointer"
                            >
                                <option value="10">10 Ads</option>
                                <option value="20">20 Ads</option>
                                <option value="50">50 Ads</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !keyword}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 whitespace-nowrap"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Searching...
                                </span>
                            ) : 'Find Ads'}
                        </button>
                    </div>
                </form>

                {/* Filters Toolbar */}
                {ads.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-wrap gap-4 items-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2">Filters:</span>

                        <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-all ${activeOnly ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
                            <input
                                type="checkbox"
                                checked={activeOnly}
                                onChange={(e) => setActiveOnly(e.target.checked)}
                                className="hidden"
                            />
                            <span className="w-2 h-2 rounded-full bg-current"></span>
                            <span className="text-xs font-bold">Active Only</span>
                        </label>

                        <div className="h-6 w-px bg-zinc-800 mx-2"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Min Duration:</span>
                            <div className="flex bg-black border border-zinc-800 rounded-lg p-0.5">
                                {[0, 3, 7, 30].map(days => (
                                    <button
                                        key={days}
                                        onClick={() => setMinDaysActive(days)}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${minDaysActive === days ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                    >
                                        {days === 0 ? 'Any' : `${days}d+`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-6 w-px bg-zinc-800 mx-2"></div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Sort By:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="bg-black border border-zinc-800 text-zinc-300 text-xs font-bold rounded-lg px-2 py-1.5 focus:outline-none focus:border-zinc-600 cursor-pointer"
                            >
                                <option value="recent">Recent First</option>
                                <option value="longest_running">Longest Running</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Grid */}
            {(hasSearched || loading) && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-xl font-bold text-white">
                            {loading ? 'Searching Ads...' : 'Search Results'}
                            {!loading && (
                                <span className="ml-3 text-sm font-normal text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                                    {filteredAds.length} ads found
                                </span>
                            )}
                        </h2>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {[...Array(8)].map((_, i) => (
                                <SkeletonAdCard key={i} />
                            ))}
                        </div>
                    ) : filteredAds.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredAds.map((ad, i) => (
                                <AdCard
                                    key={ad.adArchiveID || i}
                                    ad={ad}
                                    initialIsSaved={savedAdIds.has(ad.adArchiveID)}
                                    onToggleSave={(isSaved) => {
                                        const newSet = new Set(savedAdIds)
                                        if (isSaved) {
                                            newSet.add(ad.adArchiveID)
                                        } else {
                                            newSet.delete(ad.adArchiveID)
                                        }
                                        setSavedAdIds(newSet)
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-zinc-900/50 border border-zinc-800 border-dashed rounded-3xl">
                            {error ? (
                                <div className="max-w-md mx-auto">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white font-bold mb-2">Search Failed</h3>
                                    <p className="text-zinc-400 text-sm">{error}</p>
                                </div>
                            ) : (
                                <div>
                                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-white font-bold mb-2">No Ads Found</h3>
                                    <p className="text-zinc-400 text-sm">Try using different keywords or broad search terms.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
