'use client'

import { Users, Globe, Bookmark, Clock, Compass, Shield, Settings, LogOut, Activity } from 'lucide-react'

interface AdminSidebarProps {
    activeTab: 'users' | 'ads' | 'saved' | 'history' | 'profile' | 'pagediscovery'
    setActiveTab: (tab: 'users' | 'ads' | 'saved' | 'history' | 'profile' | 'pagediscovery') => void
    onSignOut: () => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
}

export default function AdminSidebar({ activeTab, setActiveTab, onSignOut, sidebarOpen, setSidebarOpen }: AdminSidebarProps) {
    const menuItems = [
        { id: 'users', label: 'User Management', icon: Users },
        { id: 'ads', label: 'Global Campaigns', icon: Globe },
        { id: 'pagediscovery', label: 'Discovery Engine', icon: Compass },
        { id: 'saved', label: 'Saved Library', icon: Bookmark },
        { id: 'history', label: 'Search History', icon: Clock },
        { id: 'profile', label: 'Administrator', icon: Shield },
    ]

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden animate-fade-in"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* SidebarContainer */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 h-screen
                bg-black/60 backdrop-blur-2xl border-r border-white/5 
                transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) shadow-2xl
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 flex flex-col
            `}>
                {/* Logo Area */}
                <div className="p-8 pb-6 border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/10 blur-[50px] rounded-full pointer-events-none" />

                    <div className="flex items-center gap-3 mb-1 group cursor-default relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)] group-hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-500 ring-1 ring-white/10">
                            <Activity className="w-6 h-6 text-white transform group-hover:scale-110 transition-transform duration-500" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black italic tracking-tighter leading-none text-white drop-shadow-md">
                                IKONIC
                            </h1>
                            <span className="text-[10px] font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 tracking-[0.2em] uppercase">
                                MARKETERS
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-[0.2em] mb-4 px-4">Menu</div>

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
                                    relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 group overflow-hidden
                                    ${isActive
                                        ? 'text-white'
                                        : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'}
                                `}
                            >
                                {/* Active Background Glow */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-transparent border-l-2 border-red-600 animate-fade-in" />
                                )}

                                <span className={`
                                    relative z-10 p-2 rounded-lg transition-all duration-300
                                    ${isActive
                                        ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg shadow-red-600/20'
                                        : 'bg-zinc-900/50 group-hover:bg-zinc-800 text-zinc-400 group-hover:text-white group-hover:scale-110'}
                                `}>
                                    <Icon className="w-4 h-4" />
                                </span>

                                <span className="relative z-10 font-bold text-sm tracking-wide">{item.label}</span>

                                {isActive && (
                                    <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" />
                                )}
                            </button>
                        )
                    })}

                    <div className="text-[10px] font-extrabold text-zinc-600 uppercase tracking-[0.2em] mt-8 mb-4 px-4">System</div>
                    <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-zinc-600 cursor-not-allowed opacity-50 hover:bg-zinc-900/30 transition-colors">
                        <span className="p-2 rounded-lg bg-zinc-900/30 text-zinc-600">
                            <Settings className="w-5 h-5" />
                        </span>
                        <span className="font-bold text-sm">Settings</span>
                    </button>
                </nav>

                {/* Footer / Sign Out */}
                <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-md">
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 hover:bg-red-900/20 text-zinc-400 hover:text-red-400 transition-all border border-white/5 hover:border-red-500/30 group active:scale-95"
                    >
                        <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                        <span className="font-bold text-sm uppercase tracking-wide">Sign Out</span>
                    </button>
                    <div className="flex justify-between items-center px-2 mt-4 text-[10px] text-zinc-600 font-mono">
                        <span className="tracking-widest">ADMIN CONSOLE</span>
                        <div className="flex items-center gap-1.5 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-900/30">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-green-500 font-bold">ONLINE</span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}
