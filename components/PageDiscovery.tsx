'use client'

import React, { useState } from 'react'
import {
    Search, MapPin, Globe, Users, Phone, Mail, ExternalLink,
    Filter, Play, AlertCircle, CheckCircle, Navigation, Star, Target, UserCheck, Sparkles, Layers, List, ShieldAlert, AlertTriangle
} from 'lucide-react'
import PagePreviewModal from './modals/PagePreviewModal'
import MaterialDropdown from '@/components/ui/MaterialDropdown'
// Redefine locally to ensure self-contained type safety and avoid import issues
interface FacebookPageLocal {
    // Core identifiers
    facebookUrl?: string
    pageUrl?: string
    url?: string
    profile_url?: string
    pageId?: string
    facebookId?: string
    facebook_id?: string
    
    // Names
    title?: string
    pageName?: string
    name?: string
    
    // Categories
    categories?: string[]
    category?: string
    type?: string
    
    // Engagement stats
    likes?: number
    followers?: number
    followings?: number
    
    // Contact info
    phone?: string
    email?: string
    website?: string
    websites?: string[]
    address?: string
    messenger?: string | null
    
    // Rating
    rating?: string
    ratingOverall?: number | null
    ratingCount?: number | null
    
    // Images
    profilePictureUrl?: string
    coverPhotoUrl?: string
    profilePhoto?: string
    profilePic?: string
    coverUrl?: string
    image?: {
        uri?: string
        width?: number
        height?: number
    }
    
    // Text content
    info?: string[]
    intro?: string
    about_me?: {
        text: string
        urls: any[]
    }
    
    // Verification
    CONFIRMED_OWNER_LABEL?: string
    confirmed_owner?: string
    is_verified?: boolean
    verificationStatus?: string
    
    // Ads status
    ad_status?: string
    pageAdLibrary?: {
        is_business_page_active: boolean
        id: string
    }
    
    // Dates
    creation_date?: string
    scrapedAt?: string
    
    // Other
    alternativeSocialMedia?: string
    priceRange?: string
    instagram?: {
        username: string
        url: string
    }[]
    
    // Relevance from API
    relevanceScore?: number
}

interface PageDiscoveryProps {
    onSearchAds?: (url: string) => void
    initialState?: {
        keywords: string
        location: string
        limit: string
    } | null
}

export default function PageDiscovery({ onSearchAds, initialState }: PageDiscoveryProps) {
    // Search State
    const [keywords, setKeywords] = useState('')
    const [location, setLocation] = useState('')
    const [limit, setLimit] = useState('10')

    // Data State
    const [pages, setPages] = useState<FacebookPageLocal[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filter & Sort State
    const [filterAdsOnly, setFilterAdsOnly] = useState(false)
    const [filterHasEmail, setFilterHasEmail] = useState(false)
    const [filterHasWebsite, setFilterHasWebsite] = useState(false)
    const [filterHasPhone, setFilterHasPhone] = useState(false)
    const [filterConfirmedOwner, setFilterConfirmedOwner] = useState(false)
    const [sortBy, setSortBy] = useState<'followers' | 'newest' | 'rating' | 'reviews'>('followers')

    // Modal State
    const [selectedPage, setSelectedPage] = useState<FacebookPageLocal | null>(null)
    const [hasSearched, setHasSearched] = useState(false)

    // Persistence Key
    const STORAGE_KEY = 'FACEBOOK_PAGE_DISCOVERY_STATE'

    // Auto-search on mount if initial state is present
    React.useEffect(() => {
        const initializeState = async () => {
            // Priority 1: Props
            if (initialState) {
                setKeywords(initialState.keywords)
                setLocation(initialState.location)
                setLimit(initialState.limit)

                // Short timeout
                setTimeout(() => {
                    executeSearch(initialState.keywords, initialState.location, initialState.limit)
                }, 100)
                return
            }

            // Priority 2: Local Storage
            try {
                const saved = localStorage.getItem(STORAGE_KEY)
                if (saved) {
                    const parsed = JSON.parse(saved)
                    // Only restore if less than 24 hours old
                    const isRecent = (Date.now() - (parsed.timestamp || 0)) < 1000 * 60 * 60 * 24

                    if (isRecent) {
                        setKeywords(parsed.keywords || '')
                        setLocation(parsed.location || '')
                        setLimit(parsed.limit || '10')
                        setPages(parsed.pages || [])
                        setHasSearched(parsed.hasSearched || false)
                        setFilterAdsOnly(parsed.filterAdsOnly || false)
                        setFilterHasEmail(parsed.filterHasEmail || false)
                        setFilterHasWebsite(parsed.filterHasWebsite || false)
                        setFilterHasPhone(parsed.filterHasPhone || false)
                        setFilterConfirmedOwner(parsed.filterConfirmedOwner || false)
                        setSortBy(parsed.sortBy || 'followers')

                        if (parsed.loading) {
                            setTimeout(() => {
                                executeSearch(
                                    parsed.keywords || '',
                                    parsed.location || '',
                                    parsed.limit || '10'
                                )
                            }, 500)
                        }
                    }
                }
            } catch (e) {
                console.error("Failed to restore page discovery state", e)
            }
        }
        initializeState()
    }, [initialState])

    // Save state to Local Storage
    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (hasSearched || keywords) {
                const stateToSave = {
                    keywords,
                    location,
                    limit,
                    pages,
                    hasSearched: hasSearched && !loading, // Don't persist hasSearched=true if strictly stuck in loading, wait for done. OR keep it true if we re-trigger.
                    loading,
                    filterAdsOnly,
                    filterHasEmail,
                    filterHasWebsite,
                    filterHasPhone,
                    filterConfirmedOwner,
                    sortBy,
                    timestamp: Date.now()
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave))
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [keywords, location, limit, pages, hasSearched, loading, filterAdsOnly, filterHasEmail, filterHasWebsite, filterHasPhone, filterConfirmedOwner, sortBy])

    const limitOptions = React.useMemo(() => [
        { value: '10', label: '10 Pages' },
        { value: '20', label: '20 Pages' },
        { value: '50', label: '50 Pages' },
        { value: '100', label: '100 Pages' },
        { value: '1000', label: '1000 Pages' }
    ], [])

    const sortOptions = React.useMemo(() => [
        { value: 'followers', label: 'Most Followers', icon: Users },
        { value: 'rating', label: 'Best Rated', icon: Star },
        { value: 'reviews', label: 'Most Reviews', icon: Star },
        { value: 'newest', label: 'Newest Created', icon: Sparkles }
    ], [])


    const executeSearch = async (searchKeywords: string, searchLocation: string, searchLimit: string) => {
        if (!searchKeywords.trim()) return

        setLoading(true)
        setError(null)
        setPages([])
        setHasSearched(true)

        try {
            // Split keywords by comma
            const keywordList = searchKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0)

            const res = await fetch('/api/pages/discovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords: keywordList,
                    location: searchLocation.trim(),
                    limit: Number(searchLimit)
                })
            })

            const data = await res.json()

            if (!res.ok) throw new Error(data.error || 'Failed to discover pages')

            setPages(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        executeSearch(keywords, location, limit)
    }

    // Filter & Sort Logic
    const filteredPages = React.useMemo(() => {
        let result = [...pages]

        if (filterAdsOnly) {
            result = result.filter(p => {
                const isRunning = p.pageAdLibrary?.is_business_page_active ||
                    (p.ad_status && p.ad_status.toLowerCase().includes('running ads') && !p.ad_status.toLowerCase().includes('not'))
                return isRunning
            })
        }

        if (filterHasEmail) {
            result = result.filter(p => !!p.email)
        }

        if (filterHasWebsite) {
            result = result.filter(p => !!p.website || (p.websites && p.websites.length > 0))
        }

        if (filterHasPhone) {
            result = result.filter(p => !!p.phone)
        }

        if (filterConfirmedOwner) {
            result = result.filter(p => !!p.CONFIRMED_OWNER_LABEL || !!p.confirmed_owner)
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'followers': return (b.followers || 0) - (a.followers || 0)
                case 'rating': return (b.ratingOverall || 0) - (a.ratingOverall || 0)
                case 'reviews': return (b.ratingCount || 0) - (a.ratingCount || 0)
                case 'newest': return new Date(b.creation_date || 0).getTime() - new Date(a.creation_date || 0).getTime()
                default: return 0
            }
        })

        return result
    }, [pages, filterAdsOnly, filterHasEmail, filterHasWebsite, filterHasPhone, filterConfirmedOwner, sortBy])

    return (
        <div className="space-y-12 animate-fade-in-up pb-32">
            {/* Hero Search Section */}
            <div className="relative z-30 flex flex-col items-center justify-center pt-10 pb-6 w-full max-w-5xl mx-auto">

                {/* Global Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] z-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] blur-[120px] rounded-full mix-blend-screen transition-colors duration-1000 bg-purple-600/20 opacity-40 animate-pulse-slow"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] blur-[100px] rounded-full mix-blend-screen transition-colors duration-1000 bg-indigo-600/10 opacity-30 animate-pulse-slower"></div>
                </div>

                {/* Main Heading Text */}
                <div className="text-center mb-10 relative z-10">
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 tracking-tighter mb-4 drop-shadow-2xl">
                        Page Discovery<span className="text-purple-500">.</span>
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        Discover public Facebook pages by industry, niche, or topic. Analyze their performance and ads.
                    </p>
                </div>

                {/* Central Glass Search Module */}
                <div className="w-full relative z-20 group">
                    <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-purple-600 to-indigo-600 opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" />

                    <div className="relative z-50 bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-2 shadow-2xl flex flex-col items-center gap-4 overflow-visible ring-1 ring-white/5">
                        <form onSubmit={handleSearch} className="w-full">
                            <div className="flex flex-col md:flex-row gap-2 w-full">
                                {/* Keyword Input */}
                                <div className="flex-1 relative group/input h-[64px]">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                        <Search className="w-6 h-6 text-zinc-600 group-focus-within/input:text-purple-400 transition-colors duration-300" />
                                    </div>
                                    <input
                                        type="text"
                                        value={keywords}
                                        onChange={(e) => setKeywords(e.target.value)}
                                        placeholder="Industry keywords (e.g. Gyms, Design)..."
                                        className="w-full bg-zinc-900/30 md:bg-transparent rounded-[1.5rem] md:rounded-l-[1.5rem] border-none text-xl font-bold text-white placeholder-zinc-700 focus:ring-0 focus:outline-none h-full pl-16 pr-4 tracking-tight"
                                    />
                                </div>

                                {/* Divider for desktop */}
                                <div className="hidden md:block w-px bg-white/10 my-3 self-stretch" />

                                {/* Location Input */}
                                <div className="flex-1 md:flex-[0.6] relative group/input h-[64px]">
                                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                                        <MapPin className="w-5 h-5 text-zinc-600 group-focus-within/input:text-purple-400 transition-colors duration-300" />
                                    </div>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Location (Optional)..."
                                        className="w-full bg-zinc-900/30 md:bg-transparent rounded-[1.5rem] md:rounded-none border-none text-lg font-bold text-white placeholder-zinc-700 focus:ring-0 focus:outline-none h-full pl-14 pr-4 tracking-tight"
                                    />
                                </div>

                                {/* Search Button */}
                                <button
                                    type="submit"
                                    disabled={loading || !keywords}
                                    className={`
                                        h-[64px] px-10 rounded-[1.5rem] font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                                        bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 flex items-center gap-2 group/searchBtn shrink-0
                                    `}
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <span>Discover</span>
                                            <Sparkles className="w-5 h-5 fill-white/20 group-hover/searchBtn:scale-110 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Minimal Filters Below */}
                    <div className="flex items-center justify-center gap-4 mt-6 text-zinc-500 relative z-20">
                        <div className="w-[180px]">
                            <MaterialDropdown
                                value={limit}
                                onChange={setLimit}
                                options={limitOptions}
                                label="Results Limit"
                                icon={Layers}
                                width="w-full"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* Filters */}
            {pages.length > 0 && (
                <div className="mt-10 flex flex-col space-y-4 animate-fade-in relative z-10 border-t border-white/5 pt-6">
                    {/* Filters Row */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-500 uppercase tracking-widest mr-2">
                            <Filter className="w-3 h-3" />
                            <span>Filters</span>
                        </div>

                        <button
                            onClick={() => setFilterAdsOnly(!filterAdsOnly)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all backgrop-blur-md
                                ${filterAdsOnly
                                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                                    : 'bg-black/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:bg-white/5'}
                            `}
                        >
                            <div className={`w-2 h-2 rounded-full ${filterAdsOnly ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                            Has Ads
                        </button>

                        <button
                            onClick={() => setFilterHasEmail(!filterHasEmail)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all backdrop-blur-md
                                ${filterHasEmail
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    : 'bg-black/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:bg-white/5'}
                            `}
                        >
                            <Mail className="w-3 h-3" />
                            Email
                        </button>

                        <button
                            onClick={() => setFilterHasWebsite(!filterHasWebsite)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all backdrop-blur-md
                                ${filterHasWebsite
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                                    : 'bg-black/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:bg-white/5'}
                            `}
                        >
                            <Globe className="w-3 h-3" />
                            Website
                        </button>

                        <button
                            onClick={() => setFilterHasPhone(!filterHasPhone)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all backdrop-blur-md
                                ${filterHasPhone
                                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                                    : 'bg-black/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:bg-white/5'}
                            `}
                        >
                            <Phone className="w-3 h-3" />
                            Phone
                        </button>

                        <button
                            onClick={() => setFilterConfirmedOwner(!filterConfirmedOwner)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all backdrop-blur-md
                                ${filterConfirmedOwner
                                    ? 'bg-teal-500/10 border-teal-500/30 text-teal-400'
                                    : 'bg-black/40 border-white/5 text-zinc-400 hover:border-zinc-700 hover:bg-white/5'}
                            `}
                        >
                            <UserCheck className="w-3 h-3" />
                            Confirmed Owner
                        </button>
                    </div>

                    {/* Sort Row */}
                    <div className="flex items-center justify-end w-full relative z-20">
                        <div className="w-[220px]">
                            <MaterialDropdown
                                value={sortBy}
                                onChange={setSortBy}
                                options={sortOptions}
                                placeholder="Sort Pages"
                                icon={List}
                            />
                        </div>
                    </div>
                </div>
            )}


            {/* Results Grid */}
            {
                (hasSearched || loading) && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                <span>{loading ? 'Discovering Pages' : 'Discovery Results'}</span>
                                {loading && <span className="flex h-2 w-2 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span></span>}
                            </h2>
                            {!loading && (
                                <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-zinc-400 border border-white/5">
                                    {filteredPages.length} Pages Found
                                </span>
                            )}
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl h-[300px] animate-pulse relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent skew-x-12 translate-x-[-100%] animate-shimmer" />
                                    </div>
                                ))}
                            </div>
                        ) : filteredPages.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {filteredPages.map((page, i) => (
                                    <PageCard
                                        key={page.pageId || i}
                                        page={page}
                                        onSearchAds={onSearchAds}
                                        onView={() => setSelectedPage(page)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                                {error ? (
                                    <div className={`max-w-md border rounded-3xl p-8 backdrop-blur-md ${error.toLowerCase().includes('usage limit')
                                            ? 'bg-amber-500/10 border-amber-500/20'
                                            : 'bg-red-500/10 border-red-500/20'
                                        }`}>
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${error.toLowerCase().includes('usage limit') ? 'bg-amber-500/20' : 'bg-red-500/20'
                                            }`}>
                                            {error.toLowerCase().includes('usage limit') ? (
                                                <ShieldAlert className="w-6 h-6 text-amber-500" />
                                            ) : (
                                                <AlertCircle className="w-6 h-6 text-red-500" />
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-2">
                                            {error.toLowerCase().includes('usage limit') ? 'Service Warning' : 'Discovery Failed'}
                                        </h3>
                                        <p className="text-zinc-400 mb-4">{error}</p>

                                        {error.toLowerCase().includes('usage limit') && (
                                            <div className="bg-black/40 rounded-xl p-4 text-xs text-zinc-500 font-mono text-left border border-white/5">
                                                <p className="mb-2 font-bold text-amber-500/80">ADMINISTRATOR ACTION REQUIRED:</p>
                                                <p>The external data provider monthly quota has been reached. Please upgrade the plan or wait for the next billing cycle.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="max-w-md">
                                        <div className="w-24 h-24 bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl relative group">
                                            <Search className="w-10 h-10 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                                            <div className="absolute inset-0 border border-white/10 rounded-full animate-pulse-slow" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white mb-3">No Pages Found</h3>
                                        <p className="text-zinc-400">
                                            We couldn't find any public pages matching your criteria. Try different keywords or location.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            }

            <PagePreviewModal
                page={selectedPage as any}
                onClose={() => setSelectedPage(null)}
                onSearchAds={(url) => {
                    if (onSearchAds) onSearchAds(url)
                    setSelectedPage(null)
                }}
            />
        </div >
    )
}

function PageCard({ page, onSearchAds, onView }: { page: FacebookPageLocal, onSearchAds?: (url: string) => void, onView: () => void }) {

    // Derived Data - handle all field name variations
    const isAdsRunning = page.pageAdLibrary?.is_business_page_active ||
        (page.ad_status && page.ad_status.toLowerCase().includes('running ads') && !page.ad_status.toLowerCase().includes('not'))

    // Profile image - check all possible sources
    const profileImgSrc = page.profilePictureUrl || page.profilePhoto || page.profilePic || page.image?.uri || 
        (page.facebookId || page.facebook_id || page.pageId ? `https://graph.facebook.com/${page.facebookId || page.facebook_id || page.pageId}/picture?type=large` : null)
    
    // Cover image - fallback to profile if needed
    const coverImgSrc = page.coverPhotoUrl || page.coverUrl || profileImgSrc

    // Verification status - check all variations
    const ownerLabel = page.CONFIRMED_OWNER_LABEL || page.confirmed_owner || (page.is_verified ? 'Verified' : null)
    
    // Intro text - check multiple sources
    const introText = page.intro || page.about_me?.text || (page.info && page.info.length > 0 ? page.info[0] : null)
    
    // Page title - handle all name variations
    const pageTitle = page.title || page.pageName || page.name
    
    // Page URL - handle all URL variations
    const pageUrl = page.facebookUrl || page.pageUrl || page.url || page.profile_url
    
    // Page ID - handle all ID variations
    const pageIdValue = page.pageId || page.facebookId || page.facebook_id
    
    // Categories - handle different formats
    const pageCategories = page.categories || (page.category ? [page.category] : (page.type ? [page.type] : []))

    return (
        <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-[2rem] overflow-hidden hover:border-purple-500/30 hover:bg-zinc-900/40 transition-all flex flex-col group relative shadow-lg hover:shadow-purple-900/10 hover:-translate-y-1 ring-1 ring-white/10">
            {/* Header / Cover */}
            <div
                className="h-36 bg-zinc-900 relative overflow-hidden cursor-pointer group/header"
                onClick={onView}
            >
                {/* Real Cover Image */}
                <div className="absolute inset-0 bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={coverImgSrc || ''}
                        alt="Cover"
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover/header:rotate-1 group-hover/header:scale-105 ${!coverImgSrc || coverImgSrc === profileImgSrc ? 'blur-2xl opacity-40 scale-125' : ''}`}
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />

                {/* Top Right Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-20">
                    {isAdsRunning && (
                        <span className="px-2.5 py-1 bg-green-500/20 backdrop-blur-sm rounded-lg text-xs font-bold text-green-400 border border-green-500/20 flex items-center gap-1 shadow-lg animate-fade-in-up">
                            <CheckCircle className="w-3 h-3" />
                            <span>Ads Active</span>
                        </span>
                    )}
                </div>

                {/* Top Left Badges (Verified/Owner) */}
                {ownerLabel && (
                    <div className="absolute top-3 left-3 z-20">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 text-[10px] font-bold backdrop-blur-md shadow-lg">
                            <UserCheck className="w-3 h-3" />
                            Confirmed Owner
                        </span>
                    </div>
                )}
            </div>

            <div className="px-6 pb-6 flex-1 flex flex-col relative">
                {/* Profile Pic Placeholder & Title */}
                <div className="relative -mt-10 mb-3 flex items-end justify-between pointer-events-none z-10">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border-4 border-black shadow-xl flex items-center justify-center overflow-hidden relative group cursor-pointer pointer-events-auto ring-1 ring-white/10" onClick={onView}>
                        {/* Placeholder Background (Rendered First) */}
                        <div className="text-2xl font-black text-zinc-700 absolute inset-0 flex items-center justify-center bg-zinc-900 z-0 select-none">
                            {pageTitle ? pageTitle.charAt(0).toUpperCase() : 'P'}
                        </div>

                        {/* Actual Image (Rendered Second, on top) */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={profileImgSrc || ''}
                            onError={(e) => {
                                // Fallback logic
                                if (pageIdValue && !e.currentTarget.src.includes('graph.facebook')) {
                                    e.currentTarget.src = `https://graph.facebook.com/${pageIdValue}/picture?type=large`;
                                } else {
                                    e.currentTarget.style.display = 'none';
                                }
                            }}
                            alt="Profile"
                            className="w-full h-full object-cover relative z-10 bg-zinc-800 transition-transform group-hover:scale-110"
                        />
                    </div>

                    {/* Tiny Rating Badge if exists */}
                    {(page.ratingOverall || (page.rating && parseFloat(page.rating) > 0)) && (
                        <div className="mb-2 pointer-events-auto">
                            <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-yellow-500 text-xs font-bold shadow-lg shadow-yellow-500/10">
                                <Star className="w-3 h-3 fill-yellow-500" />
                                {page.ratingOverall ? page.ratingOverall.toFixed(1) : parseFloat(page.rating || '0').toFixed(1)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <h3 onClick={onView} className="text-lg font-black text-white leading-tight mb-2 group-hover:text-purple-400 transition-colors line-clamp-2 cursor-pointer">
                        {pageTitle}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        {pageCategories
                            .filter(Boolean)
                            .filter(c => c !== 'Page' && c !== 'page')
                            .slice(0, 2)
                            .map((cat, i) => (
                                <span key={i} className="bg-white/5 px-2 py-0.5 rounded text-zinc-400 border border-white/5 break-words max-w-full font-medium">
                                    {cat}
                                </span>
                            ))}
                    </div>
                </div>

                {/* Stats Row - Only show if we have data */}
                {(page.likes || page.followers || page.followings) && (
                    <div className="grid grid-cols-2 gap-2 mb-4 py-3 border-y border-white/5 bg-white/[0.02] -mx-6 px-6">
                        <div className="flex flex-col">
                            <div className="text-[10px] uppercase text-zinc-500 font-extrabold flex items-center gap-1.5 mb-0.5">
                                <Target className="w-3 h-3" /> {page.likes ? 'Likes' : 'Following'}
                            </div>
                            <div className="text-sm font-bold text-zinc-200">
                                {(page.likes || page.followings || 0).toLocaleString()}
                            </div>
                        </div>
                        <div className="flex flex-col border-l border-white/5 pl-4">
                            <div className="text-[10px] uppercase text-zinc-500 font-extrabold flex items-center gap-1.5 mb-0.5">
                                <Users className="w-3 h-3" /> Followers
                            </div>
                            <div className="text-sm font-bold text-zinc-200">
                                {(page.followers || 0).toLocaleString()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Text / Intro */}
                {introText && (
                    <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/5 text-xs text-zinc-400 line-clamp-3 italic">
                        &quot;{introText}&quot;
                    </div>
                )}
                
                {/* Contact Info Row - Show available contact details */}
                {(page.email || page.phone || page.website) && (
                    <div className="mb-4 flex flex-wrap gap-2 text-xs">
                        {page.email && (
                            <a href={`mailto:${page.email}`} className="flex items-center gap-1 text-zinc-400 hover:text-purple-400 transition-colors">
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{page.email}</span>
                            </a>
                        )}
                        {page.phone && (
                            <a href={`tel:${page.phone}`} className="flex items-center gap-1 text-zinc-400 hover:text-purple-400 transition-colors">
                                <Phone className="w-3 h-3" />
                                <span>{page.phone}</span>
                            </a>
                        )}
                        {page.website && (
                            <a href={page.website.startsWith('http') ? page.website : `https://${page.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-zinc-400 hover:text-purple-400 transition-colors">
                                <Globe className="w-3 h-3" />
                                <span className="truncate max-w-[120px]">{page.website}</span>
                            </a>
                        )}
                    </div>
                )}
                
                {/* Address - only if no intro and has address */}
                {!introText && page.address && (
                    <div className="mb-4 text-xs text-zinc-500 flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 font-medium">{page.address.replace(/http[^\s]+/, '')}</span>
                    </div>
                )}
                
                {/* Creation Date */}
                {page.creation_date && (
                    <div className="mb-4 text-[10px] text-zinc-600 font-medium">
                        Created: {page.creation_date}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                    <a
                        href={pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 text-zinc-300 font-bold text-xs hover:bg-white/10 hover:text-white transition-all border border-white/5 hover:border-white/10 group/btn"
                    >
                        <ExternalLink className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                        Visit
                    </a>

                    {/* Analyze Ads Button */}
                    <button
                        onClick={() => onSearchAds && onSearchAds(pageUrl || pageTitle || '')}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-xs hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-900/20 active:scale-95 group/btn border border-white/10"
                    >
                        <Play className="w-3.5 h-3.5 fill-white group-hover/btn:scale-110 transition-transform" />
                        See Ads
                    </button>
                </div>
            </div>
        </div>
    )
}
