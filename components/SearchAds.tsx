'use client'

import React, { useState, useMemo, useEffect } from 'react'
import AdCard from './AdCard'
import SkeletonAdCard from './SkeletonAdCard'
import { validateAd, AdData } from '@/utils/adValidation'
import { createClient } from '@/utils/supabase/client'
import {
    Search, Filter, Play, Image as ImageIcon,
    Clock, Globe, ChevronDown, X, Layers, Copy, Fingerprint, Sparkles, LayoutGrid, Zap, SortAsc, MapPin, List
} from 'lucide-react'
import MaterialDropdown from '@/components/ui/MaterialDropdown'

type SortOption = 'performance' | 'recent' | 'oldest' | 'longest' | 'authority' | 'impressions'
type MediaType = 'ALL' | 'VIDEO' | 'IMAGE' | 'CAROUSEL'

interface SearchAdsProps {
    initialPageQuery?: string | null;
    initialSearchState?: {
        keyword: string
        mode: 'keyword' | 'page'
        country: string
        maxResults: string
    } | null;
}

export default function SearchAds({ initialPageQuery, initialSearchState }: SearchAdsProps) {
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


    // Sort State
    const [sortBy, setSortBy] = useState<SortOption>('performance')

    // History State
    const [recentSearches, setRecentSearches] = useState<any[]>([])
    const [showHistory, setShowHistory] = useState(false)
    const [showDuplicates, setShowDuplicates] = useState(false)

    const supabase = createClient()

    // Dynamic Theme Colors
    const theme = useMemo(() => {
        if (searchMode === 'keyword') {
            return {
                mode: 'keyword',
                primary: 'blue',
                bg: 'bg-blue-600',
                bgSoft: 'bg-blue-600/10',
                text: 'text-blue-400',
                border: 'border-blue-500/50',
                shadow: 'shadow-blue-900/20',
                ring: 'focus:ring-blue-900/20',
                gradient: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500',
                icon: Search
            }
        } else {
            return {
                mode: 'page',
                primary: 'emerald',
                bg: 'bg-emerald-600',
                bgSoft: 'bg-emerald-600/10',
                text: 'text-emerald-400',
                border: 'border-emerald-500/50',
                shadow: 'shadow-emerald-900/20',
                ring: 'focus:ring-emerald-900/20',
                gradient: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500',
                icon: Globe
            }
        }
    }, [searchMode])

    // Persistence Key
    const STORAGE_KEY = 'FACEBOOK_ADS_SEARCH_STATE'

    // Fetch saved ads & history on mount
    useEffect(() => {
        const initializeState = async () => {
            // Priority 1: Props (if navigating from another specific flow)
            if (initialPageQuery) {
                setSearchMode('page')
                setKeyword(initialPageQuery)
                // Small timeout to ensure state updates
                setTimeout(() => {
                    executeSearch(initialPageQuery, 'page', 'US', maxResults)
                }, 100)
                return
            } else if (initialSearchState) {
                setSearchMode(initialSearchState.mode)
                setKeyword(initialSearchState.keyword)
                setCountry(initialSearchState.country)
                setMaxResults(initialSearchState.maxResults)

                setTimeout(() => {
                    executeSearch(
                        initialSearchState.keyword,
                        initialSearchState.mode,
                        initialSearchState.country,
                        initialSearchState.maxResults
                    )
                }, 100)
                return
            }

            // Priority 2: Local Storage (Restore previous session)
            try {
                const saved = localStorage.getItem(STORAGE_KEY)
                if (saved) {
                    const parsed = JSON.parse(saved)
                    // Only restore if less than 24 hours old
                    const isRecent = (Date.now() - (parsed.timestamp || 0)) < 1000 * 60 * 60 * 24

                    if (isRecent) {
                        setKeyword(parsed.keyword || '')
                        setCountry(parsed.country || 'US')
                        setMaxResults(parsed.maxResults || '20')
                        setSearchMode(parsed.searchMode || 'keyword')
                        setAds(parsed.ads || [])
                        setHasSearched(parsed.hasSearched || false)
                        setEnsureUnique(parsed.ensureUnique || false)
                        setWasUniqueSearch(parsed.wasUniqueSearch || false)

                        if (parsed.loading) {
                            // Resume interrupted search
                            setTimeout(() => {
                                executeSearch(
                                    parsed.keyword,
                                    parsed.searchMode || 'keyword',
                                    parsed.country || 'US',
                                    parsed.maxResults || '20'
                                )
                            }, 500)
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to restore search state", e)
            }

            // Load Supabase Data (History/Saved)
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
                    if (item.filters?.type === 'page_discovery') return // Skip page discovery
                    if (!unique.has(item.keyword) && unique.size < 5) {
                        unique.set(item.keyword, item)
                    }
                })
                setRecentSearches(Array.from(unique.values()))
            }
        }
        initializeState()
    }, [initialPageQuery, initialSearchState])

    // Save state to Local Storage on change
    useEffect(() => {
        const timer = setTimeout(() => {
            if (hasSearched || keyword) {
                const stateToSave = {
                    keyword,
                    country,
                    maxResults,
                    searchMode,
                    ads,
                    hasSearched: hasSearched && !loading, // Only save hasSearched=true if we are done loading, otherwise we rely on 'loading' flag
                    loading,
                    ensureUnique,
                    wasUniqueSearch,
                    timestamp: Date.now()
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [keyword, country, maxResults, searchMode, ads, hasSearched, ensureUnique, wasUniqueSearch, loading])

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

    const countryOptions = useMemo(() => countries.map(c => ({ value: c.code, label: c.code, icon: c.code === 'ALL' ? Globe : undefined })), [countries])
    const limitOptions = useMemo(() => [
        { value: '10', label: '10 Ads' },
        { value: '20', label: '20 Ads' },
        { value: '50', label: '50 Ads' },
        { value: '100', label: '100 Ads' }
    ], [])
    const sortOptions = useMemo(() => [
        { value: 'performance', label: 'Best Performance', icon: Zap },
        { value: 'recent', label: 'Newest First', icon: Clock },
        { value: 'oldest', label: 'Oldest First', icon: Clock },
        { value: 'longest', label: 'Longest Running', icon: Clock },
        { value: 'impressions', label: 'Most Views', icon: Sparkles }
    ], [])


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
    const { filteredAds, duplicateCount } = useMemo(() => {
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
        if (minDaysActive > 0) {
            result = result.filter(ad => ad.adActiveDays >= minDaysActive)
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
            return { filteredAds: result, duplicateCount: duplicates.length }
        } else {
            // Show unique only
            return { filteredAds: unique, duplicateCount: duplicates.length }
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
        <div className="space-y-12 animate-fade-in-up pb-32">
            {/* Hero Search Section */}
            <div className="relative z-30 flex flex-col items-center justify-center pt-10 pb-6 w-full max-w-5xl mx-auto">

                {/* Global Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] z-0 pointer-events-none">
                    <div className={`absolute top-0 right-0 w-[600px] h-[600px] blur-[120px] rounded-full mix-blend-screen transition-colors duration-1000 ${theme.mode === 'keyword' ? 'bg-blue-600/20' : 'bg-emerald-600/10'} opacity-40 animate-pulse-slow`}></div>
                    <div className={`absolute bottom-0 left-0 w-[500px] h-[500px] blur-[100px] rounded-full mix-blend-screen transition-colors duration-1000 ${theme.mode === 'keyword' ? 'bg-purple-600/20' : 'bg-teal-600/10'} opacity-30 animate-pulse-slower`}></div>
                </div>

                {/* Main Heading Text */}
                <div className="text-center mb-10 relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 tracking-tighter mb-4 drop-shadow-2xl">
                        Ad Intelligence<span className={`${theme.text}`}>.</span>
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Uncover high-performing ads with precision. Analyze trends, creatives, and copy across the Meta ecosystem.
                    </p>
                </div>

                {/* Central Glass Search Module */}
                <div className="w-full relative z-20 group">
                    <div className={`
                        absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r ${theme.gradient} opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 pointer-events-none
                    `}></div>

                    <div className="relative z-50 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 shadow-2xl flex flex-col md:flex-row items-center gap-2 overflow-visible ring-1 ring-white/5">

                        {/* Mode Switcher (Integrated) */}
                        <div className="flex p-1.5 bg-zinc-900/50 rounded-[1.5rem] border border-white/5 self-stretch md:self-auto shrink-0 relative overflow-hidden">
                            {/* Animated Background Slider would go here, doing simple toggle for now */}
                            <button
                                onClick={() => setSearchMode('keyword')}
                                className={`
                                    relative px-6 py-3 rounded-[1.2rem] text-sm font-bold transition-all duration-300 z-10 flex items-center gap-2
                                    ${searchMode === 'keyword' ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                <Search className="w-4 h-4" />
                                Keyword
                            </button>
                            <button
                                onClick={() => setSearchMode('page')}
                                className={`
                                    relative px-6 py-3 rounded-[1.2rem] text-sm font-bold transition-all duration-300 z-10 flex items-center gap-2
                                    ${searchMode === 'page' ? 'bg-zinc-800 text-white shadow-lg ring-1 ring-white/10' : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                <Globe className="w-4 h-4" />
                                Page URL
                            </button>
                        </div>

                        {/* Search Input Area */}
                        <div className="flex-1 w-full relative h-[64px] flex items-center">
                            <form onSubmit={handleSearch} className="w-full h-full flex items-center">
                                <div className="relative w-full h-full flex items-center px-4 group/input">
                                    <theme.icon className={`w-6 h-6 text-zinc-600 group-focus-within/input:${theme.text} transition-colors duration-300 mr-4`} />
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        onFocus={() => setShowHistory(true)}
                                        onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                                        placeholder={searchMode === 'keyword' ? "Search brands, products (e.g. 'Nike')..." : "Paste Facebook Page URL..."}
                                        className="w-full bg-transparent border-none text-xl md:text-2xl font-bold text-white placeholder-zinc-700 focus:ring-0 focus:outline-none h-full tracking-tight"
                                        autoComplete="off"
                                    />

                                    {/* Recent Searches Overlay - Material Design Style */}
                                    {showHistory && recentSearches.length > 0 && (
                                        <div className="absolute top-[80px] left-0 md:left-4 right-0 md:right-4 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-white/5">
                                            <div className="px-5 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock className="w-3 h-3" />
                                                    Recent Searches
                                                </span>
                                            </div>
                                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-1.5">
                                                {recentSearches.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault()
                                                            const term = item.keyword
                                                            const mode = item.filters?.searchType === 'page' ? 'page' : 'keyword'
                                                            const filterCountry = item.filters?.country || 'US'
                                                            const historyMaxResults = item.filters?.maxResults ? String(item.filters.maxResults) : maxResults
                                                            setKeyword(term)
                                                            setSearchMode(mode)
                                                            if (mode === 'keyword') setCountry(filterCountry)
                                                            setMaxResults(historyMaxResults)
                                                            setShowHistory(false)
                                                            executeSearch(term, mode, filterCountry, historyMaxResults)
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-white/10 rounded-xl flex items-center gap-3 transition-all group active:scale-[0.99]"
                                                    >
                                                        <div className={`p-2 rounded-lg ${item.filters?.searchType === 'page' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                            {item.filters?.searchType === 'page' ? <Globe className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                                                        </div>
                                                        <span className="font-bold text-sm text-zinc-300 group-hover:text-white flex-1 truncate">{item.keyword}</span>
                                                        <span className="text-[10px] text-zinc-600 font-mono border border-zinc-800 rounded px-1.5 py-0.5">
                                                            {new Date(item.created_at).toLocaleDateString()}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>

                        {/* Action Buttons Group */}
                        <div className="flex items-center gap-2 pr-2 shrink-0 self-stretch md:self-auto">
                            {/* Settings / Limit / Country Popover Triggers (Simplified for now to match high-end sparse look) */}
                            {searchMode === 'keyword' && (
                                <div className="relative z-50 h-full w-[150px]">
                                    <MaterialDropdown
                                        value={country}
                                        onChange={setCountry}
                                        options={countryOptions}
                                        label="Region"
                                        icon={Globe}
                                        width="w-full"
                                    />
                                </div>
                            )}

                            <button
                                onClick={handleSearch}
                                disabled={loading || !keyword}
                                className={`
                                    h-[56px] px-8 rounded-[1.5rem] font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                    bg-gradient-to-r ${theme.gradient} flex items-center gap-2 group/searchBtn
                                `}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Search</span>
                                        <Zap className="w-4 h-4 fill-white group-hover/searchBtn:scale-110 transition-transform" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Secondary Filters Bar (Minimal) */}
                    <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-zinc-500 relative z-20">
                        {/* Results Limit */}
                        <div className="w-[160px] relative z-30">
                            <MaterialDropdown
                                value={maxResults}
                                onChange={setMaxResults}
                                options={limitOptions}
                                label="Limit"
                                icon={Layers}
                                width="w-full"
                            />
                        </div>

                        {/* Unique Filter */}
                        <button
                            onClick={() => setEnsureUnique(!ensureUnique)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold transition-all
                                ${ensureUnique ? `${theme.bgSoft} ${theme.text} ${theme.border}` : 'bg-zinc-900/30 border-white/5 text-zinc-500 hover:text-zinc-300'}
                            `}
                        >
                            <Fingerprint className="w-3.5 h-3.5" />
                            {ensureUnique ? 'Unique Only' : 'Allow Duplicates'}
                        </button>
                    </div>

                </div>
            </div>

            {/* Results Filters & Content */}
            {ads.length > 0 && (
                <div className="animate-fade-in-up md:px-4">
                    <div className="flex flex-col gap-6 p-6 rounded-3xl bg-zinc-900/20 border border-white/5 backdrop-blur-sm">
                        {/* Top Categories Chips */}
                        {availableCategories.length > 0 && (
                            <div className="flex flex-wrap gap-2 justify-center">
                                {availableCategories.slice(0, 10).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`
                                            px-4 py-2 rounded-full text-xs font-bold transition-all border
                                            ${selectedCategories.has(cat)
                                                ? `${theme.bg} text-white border-transparent shadow-lg`
                                                : 'bg-zinc-950/50 text-zinc-400 border-white/5 hover:border-white/20 hover:text-white'}
                                        `}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Refine Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest hidden md:block">Media:</span>
                                <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                                    {[
                                        { id: 'ALL', label: 'All', icon: LayoutGrid },
                                        { id: 'VIDEO', label: 'Video', icon: Play },
                                        { id: 'IMAGE', label: 'Image', icon: ImageIcon },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setMediaType(type.id as MediaType)}
                                            className={`
                                                px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2
                                                ${mediaType === type.id ? 'bg-zinc-800 text-white shadow-md' : 'text-zinc-500 hover:text-zinc-300'}
                                            `}
                                        >
                                            <type.icon className="w-3 h-3" />
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 ml-auto">
                                <button
                                    onClick={() => setActiveOnly(!activeOnly)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all
                                        ${activeOnly
                                            ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                            : 'bg-black/40 border-white/5 text-zinc-400 hover:bg-zinc-800'}
                                    `}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full ${activeOnly ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                                    Active Only
                                </button>

                                {/* Sort */}
                                <div className="w-[200px] relative z-20">
                                    <MaterialDropdown
                                        value={sortBy}
                                        onChange={setSortBy}
                                        options={sortOptions}
                                        icon={SortAsc}
                                        placeholder="Sort By"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Results Header & Grid */}
            {(hasSearched || loading) && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <h2 className={`text-2xl font-black text-white tracking-tight flex items-center gap-3`}>
                                {loading ? (
                                    <>
                                        <span>Scanning Ads Library</span>
                                        <span className="flex h-3 w-3 relative"><span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.bg} opacity-75`}></span><span className={`relative inline-flex rounded-full h-3 w-3 ${theme.bg}`}></span></span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className={`w-6 h-6 ${theme.text}`} />
                                        <span>Results Found</span>
                                        {wasUniqueSearch && <span className={`text-[10px] uppercase font-bold py-1 px-2 rounded-lg bg-zinc-800 text-zinc-400 border border-zinc-700 tracking-wider`}>Unique Mode Active</span>}
                                    </>
                                )}
                            </h2>
                            {!loading && (
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 bg-zinc-900/80 rounded-full text-xs font-bold text-zinc-300 border border-white/10 ${theme.shadow}`}>
                                        {filteredAds.length} {showDuplicates ? 'Total' : 'Unique'} Ads
                                    </span>
                                    {wasUniqueSearch && duplicateCount > 0 && (
                                        <button
                                            onClick={() => setShowDuplicates(!showDuplicates)}
                                            className={`
                                                px-3 py-1 rounded-full text-xs font-bold border transition-all flex items-center gap-1
                                                ${showDuplicates
                                                    ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                                                    : 'bg-blue-900/20 text-blue-400 border-blue-500/20 hover:bg-blue-900/40'}
                                            `}
                                        >
                                            <Layers className="w-3 h-3" />
                                            {showDuplicates ? 'Hide Duplicates' : `+${duplicateCount} Duplicates`}
                                        </button>
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
                                    variant={theme.primary as any}
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
                        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
                            {error ? (
                                <div className="max-w-md bg-red-500/10 border border-red-500/20 rounded-3xl p-8 backdrop-blur-md">
                                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <X className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Search Failed</h3>
                                    <p className="text-zinc-400">{error}</p>
                                </div>
                            ) : (
                                <div className="max-w-xl relative">
                                    <div className={`absolute inset-0 ${theme.bg}/20 blur-[80px] rounded-full pointer-events-none`} />
                                    <div className="relative z-10 w-24 h-24 bg-zinc-900/80 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-2xl backdrop-blur-md rotate-3 hover:rotate-6 transition-transform group">
                                        <Search className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-3">No Ads Found</h3>
                                    <p className="text-zinc-400 leading-relaxed font-medium">
                                        We couldn't find any ads matching your criteria. Try adjusting your timeframe or using broader keywords.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setSelectedCategories(new Set())
                                            setMediaType('ALL')
                                            setActiveOnly(false)
                                            setActiveOnly(false)
                                            setMinDaysActive(0)
                                        }}
                                        className={`mt-8 ${theme.text} hover:opacity-80 font-bold text-sm tracking-wide uppercase border-b border-transparent hover:border-current transition-all pb-0.5`}
                                    >
                                        Clear and Reset Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )
            }
        </div >
    )
}

