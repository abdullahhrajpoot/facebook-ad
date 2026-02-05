'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    X, MapPin, Globe, Phone, Mail,
    Facebook, ThumbsUp, Star, Users, CheckCircle, AlertCircle, Play,
    Calendar, Info, MessageCircle, DollarSign, Instagram, UserCheck, Activity, Target
} from 'lucide-react'

// Extended Interface matching User Data & Sample Object
export interface FacebookPage {
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

interface PagePreviewModalProps {
    page: FacebookPage
    onClose: () => void
    onSearchAds: (url: string) => void
}

export default function PagePreviewModal({ page, onClose, onSearchAds }: PagePreviewModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !page) return null

    // Helper: Clean Address
    const cleanAddress = (addr: string) => {
        if (!addr) return ''
        return addr.split('http')[0].replace(/,+$/, '').trim()
    }

    // Helper: Get Map Link
    const getMapLink = (addr: string) => {
        const match = addr.match(/https?:\/\/[^\s]+/)
        return match ? match[0] : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress(addr))}`
    }

    // Helper: Extract stats from info array
    const getInfoStat = (info: string[] | undefined, keyword: string): string | null => {
        if (!info) return null;
        const item = info.find(i => i.toLowerCase().includes(keyword.toLowerCase()));
        if (!item) return null;
        // Extract number at the start or rough match
        const match = item.match(/([\d,]+(?:\s*)?)/);
        return match ? match[1].trim() : null;
    }

    // Data Extraction
    const isAdsRunning = page.pageAdLibrary?.is_business_page_active ||
        (page.ad_status && page.ad_status.toLowerCase().includes('running ads') && !page.ad_status.toLowerCase().includes('not'))

    const ratingValue = page.ratingOverall || (page.rating ? parseFloat(page.rating) : 0)
    const reviewCount = page.ratingCount || (page.rating ? parseInt(page.rating.match(/\d+/)?.[0] || '0') : 0)

    const profileImgSrc = page.profilePictureUrl || page.profilePhoto || page.profilePic || `https://graph.facebook.com/${page.facebookId || page.pageId}/picture?type=large`
    const coverImgSrc = page.coverPhotoUrl || page.coverUrl || profileImgSrc

    const talkingAbout = getInfoStat(page.info, 'talking about this')
    const wereHere = getInfoStat(page.info, 'were here')

    // Combine Confirmed Owner Info
    const ownerLabel = page.CONFIRMED_OWNER_LABEL || page.confirmed_owner

    // Combine Websites
    const allWebsites = new Set<string>();
    if (page.website) allWebsites.add(page.website);
    if (page.websites) page.websites.forEach(w => allWebsites.add(w));
    const websiteList = Array.from(allWebsites);

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Window */}
            <div className="relative w-full max-w-5xl h-[95vh] sm:h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/10">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[60] p-2 sm:p-2.5 bg-black/50 backdrop-blur-md text-zinc-200 rounded-full hover:bg-white/20 hover:text-white transition-all border border-white/10 group"
                    aria-label="Close"
                >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform" />
                </button>

                {/* --- HERO SECTION --- */}
                <div className="h-36 sm:h-48 md:h-64 shrink-0 relative overflow-hidden group/cover">
                    {/* Cover Image */}
                    <div className="absolute inset-0 bg-zinc-900">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={coverImgSrc}
                            alt="Cover"
                            className={`w-full h-full object-cover transition-transform duration-1000 group-hover/cover:scale-105 ${!page.coverPhotoUrl && !page.coverUrl ? 'blur-2xl opacity-40 scale-110' : ''}`}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
                    </div>

                    {/* Verified/Owner Badge (Top Left Overlay) */}
                    {ownerLabel && (
                        <div className="absolute top-6 left-6 z-50 animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
                            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-200 text-xs font-bold backdrop-blur-md shadow-lg">
                                <UserCheck className="w-3.5 h-3.5" />
                                {ownerLabel}
                            </span>
                        </div>
                    )}
                </div>

                {/* --- HEADER CONTENT (Overlapping Hero) --- */}
                <div className="px-4 sm:px-6 md:px-10 relative z-40 -mt-16 sm:-mt-20 md:-mt-24 pointer-events-none">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
                        {/* Profile Picture */}
                        <div className="shrink-0 pointer-events-auto group/profile">
                            <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 rounded-2xl sm:rounded-3xl bg-zinc-900 border-4 sm:border-[6px] border-zinc-950 shadow-2xl overflow-hidden relative">
                                <div className="absolute inset-0 flex items-center justify-center bg-zinc-800 text-2xl sm:text-4xl font-bold text-zinc-600 select-none">
                                    {page.title?.charAt(0).toUpperCase()}
                                </div>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={profileImgSrc}
                                    alt={page.title}
                                    className="w-full h-full object-cover relative z-10 bg-zinc-800 transition-transform duration-500 group-hover/profile:scale-110"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        if ((page.facebookId || page.pageId) && !e.currentTarget.src.includes('graph.facebook')) {
                                            e.currentTarget.src = `https://graph.facebook.com/${page.facebookId || page.pageId}/picture?type=large`;
                                        } else {
                                            e.currentTarget.style.display = 'none';
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Title & Actions */}
                        <div className="flex-1 pt-2 sm:pt-24 pointer-events-auto min-w-0 w-full">
                            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3 sm:gap-4">
                                <div className="space-y-2 sm:space-y-3">
                                    <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-white leading-tight flex items-center gap-2 sm:gap-3 drop-shadow-lg">
                                        <span className="truncate">{page.title || page.pageName}</span>
                                        {page.verificationStatus === 'verified' && (
                                            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-500 fill-blue-500/10 shrink-0" />
                                        )}
                                    </h1>

                                    {/* Categories */}
                                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                        {(page.categories || [page.category]).filter(Boolean).filter(c => c !== 'Page').map((cat, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-xs font-medium text-zinc-300 shadow-sm backdrop-blur-sm">
                                                {cat}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Call to Actions */}
                                <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 xl:mt-0">
                                    {(page.facebookUrl || page.pageUrl) && (
                                        <a
                                            href={page.facebookUrl || page.pageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="h-9 sm:h-10 px-4 sm:px-5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
                                        >
                                            <Facebook className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white" />
                                            <span className="hidden xs:inline">Visit Page</span>
                                            <span className="xs:hidden">Visit</span>
                                        </a>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (page.facebookUrl || page.title) {
                                                onSearchAds(page.facebookUrl || page.title || '')
                                                onClose()
                                            }
                                        }}
                                        className="h-9 sm:h-10 px-4 sm:px-5 bg-white hover:bg-zinc-100 text-black rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 shadow-lg shadow-white/5 active:scale-95"
                                    >
                                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black fill-black" />
                                        See Ads
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SCROLLABLE CONTENT BODY --- */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 md:px-10 py-6 sm:py-8 bg-zinc-950 w-full">
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">

                        {/* --- LEFT COLUMN: DETAILS --- */}
                        <div className="xl:col-span-2 space-y-6 sm:space-y-8">

                            {/* Key Metrics Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">

                                <StatCard
                                    icon={<Users className="w-4 h-4 text-purple-400" />}
                                    label="Followers"
                                    value={page.followers}
                                    format
                                />
                                <StatCard
                                    icon={<Target className="w-4 h-4 text-amber-400" />}
                                    label="Following"
                                    value={page.followings}
                                    format
                                />
                                <StatCard
                                    icon={<MessageCircle className="w-4 h-4 text-emerald-400" />}
                                    label="Talking About"
                                    value={talkingAbout}
                                />
                                <StatCard
                                    icon={<MapPin className="w-4 h-4 text-rose-400" />}
                                    label="Were Here"
                                    value={wereHere}
                                />
                            </div>

                            {/* Additional Stats Row if needed (Rating, Founded) */}
                            {(ratingValue > 0 || page.creation_date) && (
                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                    <StatCard
                                        icon={<Star className="w-4 h-4 text-yellow-400" />}
                                        label="Rating"
                                        value={ratingValue > 0 ? ratingValue.toFixed(1) : undefined}
                                        subValue={reviewCount > 0 ? `${reviewCount} Reviews` : undefined}
                                    />
                                    <StatCard
                                        icon={<Calendar className="w-4 h-4 text-pink-400" />}
                                        label="Founded"
                                        value={page.creation_date}
                                        limit
                                    />
                                </div>
                            )}

                            {/* Intro Section */}
                            {page.intro && (
                                <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl relative overflow-hidden">
                                    <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Activity className="w-4 h-4" /> Intro
                                    </h3>
                                    <p className="text-xl font-medium text-white leading-relaxed">
                                        &quot;{page.intro}&quot;
                                    </p>
                                </div>
                            )}

                            {/* Detailed Info / About */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Info className="w-5 h-5 text-zinc-500" />
                                    About {page.title || page.pageName}
                                </h3>
                                {(page.about_me?.text || (page.info && page.info.length > 0)) && (
                                    <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                                        {page.about_me?.text ? (
                                            <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                                {page.about_me.text}
                                            </div>
                                        ) : (
                                            <div className="space-y-4 text-zinc-300">
                                                {page.info?.map((info, i) => (
                                                    <div key={i} className="flex gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 mt-2 shrink-0" />
                                                        <p className="leading-relaxed">{info}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN: SIDEBAR --- */}
                        <div className="space-y-6">

                            {/* Ad Transparency Status */}
                            <div className="p-1 rounded-2xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-zinc-800">
                                <div className="bg-zinc-950 rounded-xl p-5 space-y-4">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        Ad Transparency
                                    </h3>

                                    <div className={`flex items-start gap-4 p-4 rounded-xl border transition-colors ${isAdsRunning
                                        ? 'bg-green-500/10 border-green-500/20'
                                        : 'bg-zinc-900 border-zinc-800'
                                        }`}>
                                        {isAdsRunning ? (
                                            <div className="p-2 bg-green-500/20 rounded-full shrink-0">
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            </div>
                                        ) : (
                                            <div className="p-2 bg-zinc-800 rounded-full shrink-0">
                                                <AlertCircle className="w-5 h-5 text-zinc-500" />
                                            </div>
                                        )}
                                        <div>
                                            <div className={`font-bold text-sm mb-1 ${isAdsRunning ? 'text-green-400' : 'text-zinc-300'}`}>
                                                {isAdsRunning ? 'Currently Running Ads' : 'Not Running Ads'}
                                            </div>
                                            <div className="text-xs text-zinc-500 leading-snug">
                                                {page.ad_status || (isAdsRunning ? 'This page has active ads.' : 'No active ads found.')}
                                            </div>
                                        </div>
                                    </div>

                                    {page.pageAdLibrary?.id && (
                                        <a
                                            href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&view_all_page_id=${page.pageAdLibrary.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full py-3 text-center bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-zinc-800 hover:border-zinc-700"
                                        >
                                            View Ad Library Profile
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Instagram Section */}
                            {page.instagram && page.instagram.length > 0 && (
                                <div className="p-6 rounded-2xl border bg-zinc-900/30 border-zinc-800 space-y-4">
                                    <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Instagram className="w-4 h-4" /> Instagram
                                    </h3>
                                    <div className="space-y-3">
                                        {page.instagram.map((insta, idx) => (
                                            <a
                                                key={idx}
                                                href={insta.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all group/insta"
                                            >
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 p-[2px]">
                                                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                                                        <Instagram className="w-5 h-5 text-white" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-zinc-200 group-hover/insta:text-white">{insta.username}</div>
                                                    <div className="text-xs text-zinc-500">View Profile</div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Contact & Links */}
                            <div className="p-6 rounded-2xl border bg-zinc-900/30 border-zinc-800 space-y-5">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                    Contact & Links
                                </h3>

                                <div className="space-y-5">
                                    {websiteList.map((site, i) => (
                                        <InfoRow
                                            key={i}
                                            icon={<Globe className="w-4 h-4" />}
                                            label="Website"
                                            content={site}
                                            href={site.startsWith('http') ? site : `https://${site}`}
                                        />
                                    ))}

                                    {page.address && (
                                        <InfoRow
                                            icon={<MapPin className="w-4 h-4" />}
                                            label="Address"
                                            content={cleanAddress(page.address)}
                                            href={getMapLink(page.address)}
                                        />
                                    )}

                                    {page.phone && (
                                        <InfoRow
                                            icon={<Phone className="w-4 h-4" />}
                                            label="Phone"
                                            content={page.phone}
                                            href={`tel:${page.phone}`}
                                        />
                                    )}

                                    {page.email && (
                                        <InfoRow
                                            icon={<Mail className="w-4 h-4" />}
                                            label="Email"
                                            content={page.email}
                                            href={`mailto:${page.email}`}
                                        />
                                    )}

                                    {/* ID Metadata */}
                                    <div className="pt-4 mt-4 border-t border-zinc-800 grid grid-cols-2 gap-4">
                                        {(page.pageId) && (
                                            <div>
                                                <div className="text-[10px] text-zinc-600 font-bold mb-1">PAGE ID</div>
                                                <div className="text-xs text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800 select-all truncate">
                                                    {page.pageId}
                                                </div>
                                            </div>
                                        )}
                                        {page.facebookId && (
                                            <div>
                                                <div className="text-[10px] text-zinc-600 font-bold mb-1">FB ID</div>
                                                <div className="text-xs text-zinc-500 font-mono bg-zinc-900 px-2 py-1 rounded border border-zinc-800 select-all truncate">
                                                    {page.facebookId}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

function StatCard({ icon, label, value, subValue, format, limit }: { icon: any, label: string, value: any, subValue?: string, format?: boolean, limit?: boolean }) {
    // If value is missing completely, don't render
    if ((value === undefined || value === null) && !limit) return null

    // For string numbers like "1,356", remove clean them if formatting is requested, but usually they come as number or formatted string
    let displayValue = value
    if (format && typeof value === 'number') {
        displayValue = value.toLocaleString() // 1500 -> 1,500
    }

    return (
        <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors flex flex-col group w-full">
            <div className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 min-h-[16px] group-hover:text-zinc-400 transition-colors truncate">
                {icon} <span className="truncate">{label}</span>
            </div>
            <div className="mt-auto">
                <div className={`font-bold text-white tracking-tight ${limit ? 'text-xs truncate text-zinc-300' : 'text-xl'}`} title={String(value)}>
                    {displayValue || 'N/A'}
                </div>
                {subValue && (
                    <div className="text-xs text-zinc-500 font-medium mt-0.5">{subValue}</div>
                )}
            </div>
        </div>
    )
}

function InfoRow({ icon, label, content, href }: { icon: any, label: string, content: string, href?: string }) {
    const Component = href ? 'a' : 'div'
    return (
        <Component
            href={href}
            target={href ? "_blank" : undefined}
            rel={href ? "noopener noreferrer" : undefined}
            className="flex items-start gap-3 group/item"
        >
            <div className="w-8 h-8 rounded-lg bg-zinc-950 flex items-center justify-center shrink-0 border border-zinc-800 group-hover/item:border-zinc-700 group-hover/item:bg-zinc-800 transition-colors text-zinc-500 group-hover/item:text-zinc-300">
                {icon}
            </div>
            <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-zinc-500 mb-0.5">{label}</div>
                <div className={`text-sm text-zinc-300 transition-colors break-words ${href ? 'group-hover/item:text-blue-400 hover:underline' : ''}`}>
                    {content}
                </div>
            </div>
        </Component>
    )
}
