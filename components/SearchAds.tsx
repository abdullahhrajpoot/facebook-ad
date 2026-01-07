'use client'

import React, { useState, useMemo, useEffect } from 'react'
import AdCard from './AdCard'
import SkeletonAdCard from './SkeletonAdCard'
import { validateAd, AdData } from '@/utils/adValidation'
import { createClient } from '@/utils/supabase/client'
import {
    Search, Filter, Calendar, Play, Image as ImageIcon,
    Monitor, Trophy, TrendingUp, Clock, Globe,
    ChevronDown, X, Layers, Activity, Copy, Fingerprint
} from 'lucide-react'

type SortOption = 'performance' | 'recent' | 'oldest' | 'longest' | 'authority' | 'impressions'
type MediaType = 'ALL' | 'VIDEO' | 'IMAGE' | 'CAROUSEL'

export default function SearchAds() {
    // Search State
    const [keyword, setKeyword] = useState('')
    const [country, setCountry] = useState('US')
    const [maxResults, setMaxResults] = useState('20')
    const [searchMode, setSearchMode] = useState<'keyword' | 'page'>('keyword')

    // Data State
    const [ads, setAds] = useState<AdData[]>([])
    const [savedAdIds, setSavedAdIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(false)
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [ensureUnique, setEnsureUnique] = useState(false)
    const [wasUniqueSearch, setWasUniqueSearch] = useState(false)

    // Filter State
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
    const [mediaType, setMediaType] = useState<MediaType>('ALL')
    const [platform, setPlatform] = useState<string>('ALL')
    const [activeOnly, setActiveOnly] = useState(false)
    const [minDaysActive, setMinDaysActive] = useState<number>(0)
    const [mustHaveImpressions, setMustHaveImpressions] = useState(false)

    // Sort State
    const [sortBy, setSortBy] = useState<SortOption>('performance')

    // History State
    const [recentSearches, setRecentSearches] = useState<any[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [showDuplicates, setShowDuplicates] = useState(false)

    const supabase = createClient()

    // Fetch saved ads & history on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Fetch Saved Ads
            const { data: saved } = await supabase
                .from('saved_ads')
                .select('ad_archive_id')
                .eq('user_id', user.id)

            if (saved) {
                setSavedAdIds(new Set(saved.map(item => item.ad_archive_id)))
            }

            // 2. Fetch History (Client-side unique filter since we want recent distinct keywords)
            const { data: history } = await supabase
                .from('search_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(20)

            if (history) {
                const unique = new Map()
                history.forEach(item => {
                    if (!unique.has(item.keyword) && unique.size < 5) {
                        unique.set(item.keyword, item)
                    }
                })
                setRecentSearches(Array.from(unique.values()))
            }
        }
        fetchInitialData()
    }, [])

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

    const executeSearch = async (searchKeyword: string, mode: 'keyword' | 'page', searchCountry: string, count: string) => {
        if (!searchKeyword.trim()) return

        setLoading(true)
        setError(null)
        setHasSearched(true)
        setAds([])
        setSelectedCategories(new Set()) // Reset categories on new search
        setShowDuplicates(false) // Reset view mode
        setWasUniqueSearch(ensureUnique) // Track if this search was unique

        try {
            const endpoint = mode === 'keyword' ? '/api/ads/search' : '/api/ads/search-page'
            const body = mode === 'keyword'
                ? {
                    keyword: searchKeyword,
                    country: searchCountry === 'ALL' ? undefined : searchCountry,
                    maxResults: Number(count),
                    unique: ensureUnique
                }
                : {
                    pageNameOrUrl: searchKeyword,
                    count: Number(count),
                    unique: ensureUnique
                }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to fetch ads')

            // The API handles normalization now
            const validAds = Array.isArray(data) ? data : []

            if (validAds.length === 0 && Array.isArray(data) && data.length > 0) {
                setError(`Found ${data.length} raw ads, but 0 passed quality filters.`)
            }

            setAds(validAds)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        await executeSearch(keyword, searchMode, country, maxResults)
    }

    // 1. Dynamic Category Extraction (Memoized)
    const availableCategories = useMemo(() => {
        const cats = new Set<string>()
        ads.forEach(ad => {
            ad.pageCategories.forEach(c => cats.add(c))
        })
        return Array.from(cats).sort()
    }, [ads])

    // 2. Comprehensive Filtering & Sorting (Memoized)
    const { filteredAds, hiddenDuplicateCount } = useMemo(() => {
        let result = [...ads]

        // --- FILTERS ---

        // Category Filter
        if (selectedCategories.size > 0) {
            result = result.filter(ad =>
                ad.pageCategories.some(c => selectedCategories.has(c))
            )
        }

        // Media Type Filter
        if (mediaType !== 'ALL') {
            result = result.filter(ad => ad.mediaType === mediaType)
        }

        // Platform Filter
        if (platform !== 'ALL') {
            result = result.filter(ad =>
                ad.platforms.some(p => p.toUpperCase().includes(platform))
            )
        }

        // Active Status
        if (activeOnly) {
            result = result.filter(ad => ad.isActive)
        }

        // Duration Filter
        // Duration Filter
        if (minDaysActive > 0) {
            result = result.filter(ad => ad.adActiveDays >= minDaysActive)
        }

        // Must Have Impressions Filter
        if (mustHaveImpressions) {
            result = result.filter(ad => (ad.impressionsEstimated || 0) > 0)
        }

        // --- SORTING ---
        result.sort((a, b) => {
            switch (sortBy) {
                case 'performance':
                    return b.performanceScore - a.performanceScore
                case 'recent':
                    return new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime()
                case 'oldest':
                    return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
                case 'longest':
                    return b.adActiveDays - a.adActiveDays
                case 'authority':
                    return b.pageAuthorityScore - a.pageAuthorityScore
                case 'impressions':
                    return (b.impressionsEstimated || 0) - (a.impressionsEstimated || 0)
                default:
                    return 0
            }
        })

        // --- DEDUPLICATION ---
        const seen = new Set<string>()
        const unique: AdData[] = []
        const duplicates: AdData[] = []

        result.forEach(ad => {
            // Identifier for duplicate content: Page + Title + Body
            const key = `${ad.title} | ${ad.body} | ${ad.pageId}`
            if (seen.has(key)) {
                duplicates.push(ad)
            } else {
                seen.add(key)
                unique.push(ad)
            }
        })

        if (showDuplicates || !wasUniqueSearch) {
            // Show all (sorted)
            return { filteredAds: result, hiddenDuplicateCount: 0 }
        } else {
            // Show unique only
            return { filteredAds: unique, hiddenDuplicateCount: duplicates.length }
        }

    }, [ads, selectedCategories, mediaType, platform, activeOnly, minDaysActive, sortBy, showDuplicates, wasUniqueSearch])

    // Toggle Category Selection
    const toggleCategory = (cat: string) => {
        const newSet = new Set(selectedCategories)
        if (newSet.has(cat)) newSet.delete(cat)
        else newSet.add(cat)
        setSelectedCategories(newSet)
    }

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* Main Search Panel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative group">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div className="absolute top-0 right-0 p-32 bg-blue-600/10 blur-[100px] rounded-full group-hover:bg-blue-600/20 transition-all duration-1000"></div>
                </div>

                {/* Search Mode Tabs */}
                <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-2xl border border-zinc-800 w-fit mb-6 backdrop-blur-sm relative z-10">
                    <button
                        onClick={() => setSearchMode('keyword')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${searchMode === 'keyword' ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                    >
                        <Search className="w-4 h-4" />
                        Keyword
                    </button>
                    <button
                        onClick={() => setSearchMode('page')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${searchMode === 'page' ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50'}`}
                    >
                        <Globe className="w-4 h-4" />
                        Page
                    </button>

                    <div className="w-px h-6 bg-zinc-700 mx-2" />

                    <button
                        onClick={() => setEnsureUnique(!ensureUnique)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${ensureUnique ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Fetch extra ads to ensure unique results"
                    >
                        <Fingerprint className="w-4 h-4" />
                        {ensureUnique ? 'Unique On' : 'Unique Off'}
                    </button>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col xl:flex-row gap-4 relative z-50">
                    <div className="flex-1 relative group/input">
                        <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                            <Search className="w-5 h-5 text-zinc-500 group-focus-within/input:text-blue-500 transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            onFocus={() => setShowHistory(true)}
                            onBlur={() => setTimeout(() => setShowHistory(false), 200)} // Delay to allow click
                            placeholder={searchMode === 'keyword' ? "Search for brands, products, or keywords (e.g. 'Nike', 'SaaS')..." : "Enter Facebook Page Name or URL..."}
                            className="w-full pl-12 pr-4 py-4 bg-black border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-900/20 transition-all shadow-inner text-lg"
                        />

                        {/* Recent Searches Dropdown */}
                        {showHistory && recentSearches.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-700/50 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                        <Clock className="w-3 h-3" />
                                        Recent Searches
                                    </span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto">
                                    {recentSearches.map((item, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault() // Prevent input blur
                                                const term = item.keyword
                                                const mode = item.filters?.searchType === 'page' ? 'page' : 'keyword'
                                                const filterCountry = item.filters?.country || 'US'
                                                // Default to current maxResults if not in history, ensuring we handle string conversion
                                                const historyMaxResults = item.filters?.maxResults ? String(item.filters.maxResults) : maxResults

                                                setKeyword(term)
                                                setSearchMode(mode)
                                                if (mode === 'keyword') setCountry(filterCountry)
                                                setMaxResults(historyMaxResults)

                                                setShowHistory(false)

                                                // Immediate search with correct parameters
                                                executeSearch(term, mode, filterCountry, historyMaxResults)
                                            }}
                                            className="w-full text-left px-5 py-4 hover:bg-white/5 border-b border-white/5 last:border-0 flex items-center gap-4 text-sm text-zinc-300 transition-all group active:scale-[0.99]"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors">
                                                {item.filters?.searchType === 'page' ? <Globe className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{item.keyword}</div>
                                                <div className="text-xs text-zinc-500 flex items-center gap-2 mt-0.5">
                                                    <span>{item.filters?.searchType === 'page' ? 'Page Search' : 'Keyword Search'}</span>
                                                    {item.filters?.country && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                                            <span>{countries.find(c => c.code === item.filters.country)?.name || item.filters.country}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 transform duration-200">
                                                <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
                                                    <Search className="w-3.5 h-3.5" />
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {searchMode === 'keyword' && (
                            <div className="relative min-w-[160px] flex-1 xl:flex-none group">
                                <select
                                    value={country}
                                    onChange={(e) => setCountry(e.target.value)}
                                    className="w-full appearance-none bg-black border border-zinc-800 text-white py-4 px-5 pr-10 rounded-2xl focus:outline-none focus:border-blue-600 cursor-pointer font-medium hover:bg-zinc-900/50 transition-colors shadow-sm"
                                >
                                    {countries.map((c) => (
                                        <option key={c.code} value={c.code}>{c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-white transition-colors pointer-events-none" />
                            </div>
                        )}

                        <div className="relative min-w-[120px] flex-1 xl:flex-none group">
                            <select
                                value={maxResults}
                                onChange={(e) => setMaxResults(e.target.value)}
                                className="w-full appearance-none bg-black border border-zinc-800 text-white py-4 px-5 pr-10 rounded-2xl focus:outline-none focus:border-blue-600 cursor-pointer font-medium hover:bg-zinc-900/50 transition-colors shadow-sm"
                            >
                                <option value="10">10 Ads</option>
                                <option value="20">20 Ads</option>
                                <option value="30">30 Ads</option>
                                <option value="50">50 Ads</option>
                                <option value="100">100 Ads</option>
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-hover:text-white transition-colors pointer-events-none" />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !keyword}
                            className="flex-1 xl:flex-none bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white px-8 py-4 rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Searching...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    <span>Find Ads</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Filters Section */}
                {ads.length > 0 && (
                    <div className="mt-8 space-y-6 animate-fade-in relative z-10">
                        {/* Dynamic Categories */}
                        {availableCategories.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                    <Layers className="w-3 h-3" />
                                    <span>Categories</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {availableCategories.slice(0, 15).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => toggleCategory(cat)}
                                            className={`
                                                px-3 py-1.5 rounded-lg text-xs font-bold transition-all border
                                                ${selectedCategories.has(cat)
                                                    ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/20'
                                                    : 'bg-black/40 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white'}
                                            `}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                    {availableCategories.length > 15 && (
                                        <span className="px-2 py-1 text-xs text-zinc-600 flex items-center">
                                            +{availableCategories.length - 15} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="h-px bg-zinc-800" />

                        {/* Advanced Filters Toolbar */}
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2">
                                <Filter className="w-3 h-3" />
                                <span>Filters</span>
                            </div>

                            {/* Media Type */}
                            <div className="flex bg-black border border-zinc-800 rounded-xl p-1">
                                {[
                                    { id: 'ALL', label: 'All', icon: Layers },
                                    { id: 'VIDEO', label: 'Video', icon: Play },
                                    { id: 'IMAGE', label: 'Image', icon: ImageIcon },
                                    { id: 'CAROUSEL', label: 'Carousel', icon: Layers },
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setMediaType(type.id as MediaType)}
                                        className={`
                                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                                            ${mediaType === type.id
                                                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/5'
                                                : 'text-zinc-500 hover:text-zinc-300'}
                                        `}
                                    >
                                        <type.icon className="w-3 h-3" />
                                        {type.label}
                                    </button>
                                ))}
                            </div>

                            {/* Status */}
                            <button
                                onClick={() => setActiveOnly(!activeOnly)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all
                                    ${activeOnly
                                        ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                        : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}
                                `}
                            >
                                <div className={`w-2 h-2 rounded-full ${activeOnly ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                                Active Only
                            </button>

                            {/* Show Duplicates (Only if search was unique) */}
                            {wasUniqueSearch && (
                                <button
                                    onClick={() => setShowDuplicates(!showDuplicates)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all
                                        ${showDuplicates
                                            ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                            : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}
                                    `}
                                >
                                    <Copy className="w-3 h-3" />
                                    {showDuplicates ? 'Hide Duplicates' : 'Show Duplicates'}
                                </button>
                            )}

                            {/* Must Have Impressions */}
                            <button
                                onClick={() => setMustHaveImpressions(!mustHaveImpressions)}
                                className={`
                                    flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all
                                    ${mustHaveImpressions
                                        ? 'bg-purple-500/10 border-purple-500/50 text-purple-400'
                                        : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}
                                `}
                            >
                                <div className={`w-2 h-2 rounded-full ${mustHaveImpressions ? 'bg-purple-500 animate-pulse' : 'bg-zinc-600'}`} />
                                Must Have Impressions
                            </button>

                            {/* Duration */}
                            <div className="relative group">
                                <select
                                    value={minDaysActive}
                                    onChange={(e) => setMinDaysActive(Number(e.target.value))}
                                    className="appearance-none bg-black border border-zinc-800 text-zinc-300 text-xs font-bold rounded-xl pl-9 pr-8 py-2 hover:border-zinc-600 focus:outline-none cursor-pointer"
                                >
                                    <option value={0}>Any Duration</option>
                                    <option value={3}>3+ Days</option>
                                    <option value={7}>7+ Days</option>
                                    <option value={30}>30+ Days</option>
                                </select>
                                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500 pointer-events-none" />
                            </div>

                            <div className="flex-1" />

                            {/* Sort Dropdown */}
                            {/* Sort Dropdown */}
                            <div className="relative group">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="appearance-none bg-black border border-zinc-800 text-white text-xs font-bold rounded-xl pl-4 pr-10 py-2.5 hover:border-zinc-600 focus:outline-none cursor-pointer min-w-[160px]"
                                >
                                    <option value="performance">🔥 Best Performance</option>
                                    <option value="recent">✨ Newest First</option>
                                    <option value="oldest">📅 Oldest First</option>
                                    <option value="longest">⏳ Longest Running</option>
                                    <option value="authority">🏆 Page Authority</option>
                                    <option value="impressions">👁️ Most Impressions</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 group-hover:text-white transition-colors pointer-events-none" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Results Header & Grid */}
            {(hasSearched || loading) && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {loading ? 'Scanning Ads Library...' : 'Search Results'}
                            </h2>
                            {!loading && (
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-bold text-zinc-400 border border-zinc-700">
                                        {filteredAds.length} {showDuplicates ? 'Total' : 'Unique'} Ads
                                    </span>
                                    {hiddenDuplicateCount > 0 && !showDuplicates && (
                                        <span className="px-3 py-1 bg-blue-900/30 rounded-full text-xs font-bold text-blue-400 border border-blue-800/50">
                                            +{hiddenDuplicateCount} Duplicates Hidden
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
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
                        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                            {error ? (
                                <div className="max-w-md bg-red-500/10 border border-red-500/20 rounded-3xl p-8">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <X className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Search Failed</h3>
                                    <p className="text-zinc-400">{error}</p>
                                </div>
                            ) : (
                                <div className="max-w-md">
                                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800 shadow-xl">
                                        <Search className="w-10 h-10 text-zinc-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3">No Ads Found</h3>
                                    <p className="text-zinc-400 leading-relaxed">
                                        We couldn't find any ads matching your criteria. Try adjusting your filters or using broader keywords.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSelectedCategories(new Set())
                                            setMediaType('ALL')
                                            setActiveOnly(false)
                                            setActiveOnly(false)
                                            setMinDaysActive(0)
                                            setMustHaveImpressions(false)
                                        }}
                                        className="mt-6 text-blue-400 hover:text-blue-300 font-bold text-sm"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

