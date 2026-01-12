'use client'

import React, { useState } from 'react'
import {
    Search, MapPin, Globe, Users, Phone, Mail, ExternalLink,
    Filter, Play, AlertCircle, CheckCircle, Navigation, Star, Target, UserCheck
} from 'lucide-react'
import PagePreviewModal from './modals/PagePreviewModal'
// Redefine locally to ensure self-contained type safety and avoid import issues
interface FacebookPageLocal {
    facebookUrl?: string
    categories?: string[]
    info?: string[]
    likes?: number
    messenger?: string | null
    title?: string
    address?: string
    pageId?: string
    pageName?: string
    pageUrl?: string
    phone?: string
    email?: string
    website?: string
    websites?: string[]
    rating?: string
    ratingOverall?: number | null
    ratingCount?: number | null
    followers?: number
    followings?: number
    creation_date?: string
    ad_status?: string
    facebookId?: string
    intro?: string
    CONFIRMED_OWNER_LABEL?: string
    confirmed_owner?: string
    alternativeSocialMedia?: string
    profilePictureUrl?: string
    coverPhotoUrl?: string
    profilePhoto?: string
    category?: string
    instagram?: {
        username: string
        url: string
    }[]
    pageAdLibrary?: {
        is_business_page_active: boolean
        id: string
    }
    about_me?: {
        text: string
        urls: any[]
    }
    priceRange?: string
    // Legacy/Fallback fields
    profilePic?: string
    coverUrl?: string
    verificationStatus?: string
}

interface PageDiscoveryProps {
    onSearchAds?: (url: string) => void
}

export default function PageDiscovery({ onSearchAds }: PageDiscoveryProps) {
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
    const [sortBy, setSortBy] = useState<'likes' | 'followers' | 'newest'>('likes')

    // Modal State
    const [selectedPage, setSelectedPage] = useState<FacebookPageLocal | null>(null)
    const [hasSearched, setHasSearched] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!keywords.trim()) return

        setLoading(true)
        setError(null)
        setPages([])
        setHasSearched(true)

        try {
            // Split keywords by comma
            const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)

            const res = await fetch('/api/pages/discovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords: keywordList,
                    location: location.trim(),
                    limit: Number(limit)
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

        result.sort((a, b) => {
            switch (sortBy) {
                case 'likes': return (b.likes || 0) - (a.likes || 0)
                case 'followers': return (b.followers || 0) - (a.followers || 0)
                case 'newest': return new Date(b.creation_date || 0).getTime() - new Date(a.creation_date || 0).getTime()
                default: return 0
            }
        })

        return result
    }, [pages, filterAdsOnly, sortBy])

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* Main Search Panel */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl relative group">
                <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                    <div className="absolute top-0 right-0 p-32 bg-purple-600/10 blur-[100px] rounded-full group-hover:bg-purple-600/20 transition-all duration-1000"></div>
                </div>

                <div className="relative z-10 mb-6">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-purple-500" />
                        Find Business Pages
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        Discover public Facebook pages by industry, niche, or topic.
                    </p>
                </div>

                <form onSubmit={handleSearch} className="space-y-4 relative z-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Keyword Input */}
                        <div className="relative group/input">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block ml-1">
                                Industry Keywords
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Search className="w-5 h-5 text-zinc-500 group-focus-within/input:text-purple-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={keywords}
                                    onChange={(e) => setKeywords(e.target.value)}
                                    placeholder="e.g. Real Estate, Affiliate Marketing, Gyms..."
                                    className="w-full pl-11 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-900/20 transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Location Input */}
                        <div className="relative group/input">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block ml-1">
                                Location (Optional)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <MapPin className="w-5 h-5 text-zinc-500 group-focus-within/input:text-purple-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g. New York, London, Canada..."
                                    className="w-full pl-11 pr-4 py-3 bg-black border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-purple-600 focus:ring-4 focus:ring-purple-900/20 transition-all shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex items-end justify-between gap-4 pt-2">
                        <div className="relative group/input w-40">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block ml-1">
                                Max Results
                            </label>
                            <select
                                value={limit}
                                onChange={(e) => setLimit(e.target.value)}
                                className="w-full appearance-none bg-black border border-zinc-800 text-white py-3 px-4 rounded-xl focus:outline-none focus:border-purple-600 cursor-pointer font-medium hover:bg-zinc-900/50 transition-colors shadow-sm"
                            >
                                <option value="10">10 Pages</option>
                                <option value="20">20 Pages</option>
                                <option value="50">50 Pages</option>
                                <option value="100">100 Pages</option>
                                <option value="1000">1000 Pages (Max)</option>
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !keywords}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-600/20 active:scale-95 flex items-center justify-center gap-2 h-[50px]"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Scanning Facebook...</span>
                                </>
                            ) : (
                                <>
                                    <Search className="w-4 h-4" />
                                    <span>Discover Pages</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Filters */}
                {pages.length > 0 && (
                    <div className="mt-8 flex flex-wrap items-center gap-4 animate-fade-in relative z-10">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mr-2">
                            <Filter className="w-3 h-3" />
                            <span>Filters</span>
                        </div>

                        <button
                            onClick={() => setFilterAdsOnly(!filterAdsOnly)}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all
                                ${filterAdsOnly
                                    ? 'bg-green-500/10 border-green-500/50 text-green-400'
                                    : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700'}
                            `}
                        >
                            <div className={`w-2 h-2 rounded-full ${filterAdsOnly ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'}`} />
                            Has Ads Running
                        </button>

                        <div className="flex-1" />

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="appearance-none bg-black border border-zinc-800 text-white text-xs font-bold rounded-xl pl-4 pr-8 py-2.5 hover:border-zinc-600 focus:outline-none cursor-pointer"
                        >
                            <option value="likes">Sort: Most Likes</option>
                            <option value="followers">Sort: Most Followers</option>
                            <option value="newest">Sort: Newest</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Results Grid */}
            {
                (hasSearched || loading) && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-2xl font-bold text-white tracking-tight">
                                {loading ? 'Discovering Pages...' : 'Discovery Results'}
                            </h2>
                            {!loading && (
                                <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-bold text-zinc-400 border border-zinc-700">
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
                                    <div className="max-w-md bg-red-500/10 border border-red-500/20 rounded-3xl p-8">
                                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                        <h3 className="text-xl font-bold text-white mb-2">Discovery Failed</h3>
                                        <p className="text-zinc-400">{error}</p>
                                    </div>
                                ) : (
                                    <div className="max-w-md">
                                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800 shadow-xl">
                                            <Search className="w-10 h-10 text-zinc-600" />
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

    // Derived Data
    const isAdsRunning = page.pageAdLibrary?.is_business_page_active ||
        (page.ad_status && page.ad_status.toLowerCase().includes('running ads') && !page.ad_status.toLowerCase().includes('not'))

    const profileImgSrc = page.profilePictureUrl || page.profilePhoto || page.profilePic || `https://graph.facebook.com/${page.facebookId || page.pageId}/picture?type=large`
    // Use Cover info but fallback to profile if needed for background effect
    const coverImgSrc = page.coverPhotoUrl || page.coverUrl || profileImgSrc

    const ownerLabel = page.CONFIRMED_OWNER_LABEL || page.confirmed_owner
    const introText = page.intro || (page.info && page.info.length > 0 ? page.info[0] : null)

    return (
        <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col group relative">
            {/* Header / Cover */}
            <div
                className="h-32 bg-zinc-900 relative overflow-hidden cursor-pointer group/header"
                onClick={onView}
            >
                {/* Real Cover Image */}
                <div className="absolute inset-0 bg-zinc-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={coverImgSrc}
                        alt="Cover"
                        className={`w-full h-full object-cover transition-transform duration-700 group-hover/header:scale-105 ${!page.coverPhotoUrl && !page.coverUrl ? 'blur-xl opacity-40 scale-110' : ''}`}
                        onError={(e) => {
                            if (!page.coverPhotoUrl && !page.coverUrl) {
                                e.currentTarget.style.display = 'none';
                            }
                        }}
                    />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />

                {/* Top Right Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-20">
                    {isAdsRunning && (
                        <span className="px-2 py-1 bg-green-500/20 backdrop-blur-sm rounded-lg text-xs font-bold text-green-400 border border-green-500/20 flex items-center gap-1 shadow-lg">
                            <CheckCircle className="w-3 h-3" />
                            <span>Ads Active</span>
                        </span>
                    )}
                </div>

                {/* Top Left Badges (Verified/Owner) */}
                {ownerLabel && (
                    <div className="absolute top-3 left-3 z-20">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-200 text-[10px] font-bold backdrop-blur-md">
                            <UserCheck className="w-3 h-3" />
                            Confirmed Owner
                        </span>
                    </div>
                )}
            </div>

            <div className="px-6 pb-6 flex-1 flex flex-col relative">
                {/* Profile Pic Placeholder & Title */}
                <div className="relative -mt-12 mb-4 flex items-end justify-between pointer-events-none z-10">
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border-4 border-zinc-950 shadow-xl flex items-center justify-center overflow-hidden relative group cursor-pointer pointer-events-auto" onClick={onView}>
                        {/* Placeholder Background (Rendered First) */}
                        <div className="text-2xl font-bold text-zinc-700 absolute inset-0 flex items-center justify-center bg-zinc-900 z-0 select-none">
                            {page.title ? page.title.charAt(0).toUpperCase() : (page.pageName ? page.pageName.charAt(0).toUpperCase() : 'P')}
                        </div>

                        {/* Actual Image (Rendered Second, on top) */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={profileImgSrc}
                            onError={(e) => {
                                // Fallback logic
                                if ((page.facebookId || page.pageId) && !e.currentTarget.src.includes('graph.facebook')) {
                                    e.currentTarget.src = `https://graph.facebook.com/${page.facebookId || page.pageId}/picture?type=large`;
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
                        <div className="mb-1 pointer-events-auto">
                            <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg text-yellow-500 text-xs font-bold">
                                <Star className="w-3 h-3 fill-yellow-500" />
                                {page.ratingOverall ? page.ratingOverall.toFixed(1) : parseFloat(page.rating || '0').toFixed(1)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mb-4">
                    <h3 onClick={onView} className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-purple-400 transition-colors line-clamp-2 cursor-pointer">
                        {page.title || page.pageName}
                    </h3>
                    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                        {(page.categories || [page.category])
                            .filter(Boolean)
                            .filter(c => c !== 'Page')
                            .slice(0, 2)
                            .map((cat, i) => (
                                <span key={i} className="bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800 break-words max-w-full">
                                    {cat}
                                </span>
                            ))}
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2 mb-4 py-3 border-y border-zinc-900">
                    <div className="flex flex-col">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                            <Target className="w-3 h-3" /> Following
                        </div>
                        <div className="text-sm font-bold text-zinc-300">
                            {page.followings ? page.followings.toLocaleString() : 'N/A'}
                        </div>
                    </div>
                    <div className="flex flex-col">
                        <div className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1">
                            <Users className="w-3 h-3" /> Followers
                        </div>
                        <div className="text-sm font-bold text-zinc-300">
                            {page.followers ? page.followers.toLocaleString() : 'N/A'}
                        </div>
                    </div>
                </div>

                {/* Info Text / Intro */}
                {introText && (
                    <div className="mb-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-900 text-xs text-zinc-500 line-clamp-3 italic">
                        "{introText}"
                    </div>
                )}
                {!introText && page.address && (
                    <div className="mb-4 text-xs text-zinc-500 flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{page.address.replace(/http[^\s]+/, '')}</span>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                    <a
                        href={page.facebookUrl || page.pageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 text-zinc-300 font-bold text-xs hover:bg-zinc-800 hover:text-white transition-all border border-zinc-800 hover:border-zinc-700"
                    >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Visit
                    </a>

                    {/* Analyze Ads Button */}
                    <button
                        onClick={() => onSearchAds && onSearchAds(page.facebookUrl || page.title || '')}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold text-xs hover:from-purple-500 hover:to-blue-500 transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                    >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        See Ads
                    </button>
                </div>
            </div>
        </div>
    )
}
