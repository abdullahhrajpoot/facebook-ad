'use client'

import { useMemo } from 'react'
import { Search, Globe, Clock, Bookmark, User, LogOut } from 'lucide-react'
import useFeatureFlags from '@/utils/useFeatureFlags'

interface UserSidebarProps {
    profile: any
    activeTab: 'discover' | 'pages' | 'history' | 'saved' | 'profile'
    setActiveTab: (tab: 'discover' | 'pages' | 'history' | 'saved' | 'profile') => void
    onSignOut: () => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
}

export default function UserSidebar({ profile, activeTab, setActiveTab, onSignOut, sidebarOpen, setSidebarOpen }: UserSidebarProps) {
    const { isEnabled } = useFeatureFlags()

    const menuItems = useMemo(() => {
        const items = [
            { id: 'discover', label: 'Discover Ads', icon: Search },
        ]

        // Dynamically add Page Discovery if enabled
        if (isEnabled('page_discovery')) {
            items.push({ id: 'pages', label: 'Find Pages', icon: Globe })
        }

        items.push(
            { id: 'history', label: 'Search History', icon: Clock },
            { id: 'saved', label: 'Saved Ads', icon: Bookmark },
            { id: 'profile', label: 'My Profile', icon: User },
        )

        return items
    }, [isEnabled])

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-72 bg-black/60 backdrop-blur-xl border-r border-white/5 shadow-2xl transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 flex flex-col
            `}>
                {/* Logo Area */}
                <div className="p-8 pb-6 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />

                    <div className="flex items-center gap-3 mb-2 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-black italic tracking-tighter leading-none">
                            <span className="block text-white drop-shadow-md">IKONIC</span>
                            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent filter drop-shadow-sm">MARKETERS</span>
                        </h1>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest mb-4 px-4">Menu</div>

                    {menuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = activeTab === item.id

                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveTab(item.id as any)
                                    setSidebarOpen(false)
                                }}
                                className={`
                                    w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden
                                    ${isActive
                                        ? 'text-white'
                                        : 'text-zinc-500 hover:text-white hover:bg-white/5'}
                                `}
                            >
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent border-l-2 border-blue-500 opacity-100" />
                                )}

                                <span className={`relative z-10 p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 group-hover:scale-110 group-hover:bg-white/10'}`}>
                                    <Icon className="w-4 h-4" />
                                </span>

                                <span className="relative z-10 font-bold text-sm tracking-tight">{item.label}</span>

                                {isActive && (
                                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] animate-pulse" />
                                )}
                            </button>
                        )
                    })}
                </nav>

                {/* Footer User Info */}
                <div className="p-4 border-t border-white/5 space-y-4 bg-black/20 backdrop-blur-md">
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center text-white font-bold shrink-0 ring-1 ring-white/10 group-hover:scale-105 transition-transform">
                            {profile?.full_name?.[0]?.toUpperCase() || <User className="w-5 h-5" />}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">{profile?.full_name || 'User'}</div>
                            <div className="text-[10px] text-zinc-500 font-medium truncate tracking-wide">{profile?.email}</div>
                        </div>
                    </div>

                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest border border-red-600/20 hover:border-red-500 hover:shadow-lg hover:shadow-red-600/20 active:scale-95 group"
                    >
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    )
}
