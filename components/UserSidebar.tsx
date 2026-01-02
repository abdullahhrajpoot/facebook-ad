'use client'

interface UserSidebarProps {
    profile: any
    activeTab: 'discover' | 'history' | 'saved' | 'profile'
    setActiveTab: (tab: 'discover' | 'history' | 'saved' | 'profile') => void
    onSignOut: () => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
}

export default function UserSidebar({ profile, activeTab, setActiveTab, onSignOut, sidebarOpen, setSidebarOpen }: UserSidebarProps) {
    const menuItems = [
        {
            id: 'discover', label: 'Discover Ads', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            )
        },
        {
            id: 'history', label: 'Search History', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: 'saved', label: 'Saved Ads', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            )
        },
        {
            id: 'profile', label: 'My Profile', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
            )
        },
    ]

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-72 bg-zinc-950 border-r border-zinc-900 shadow-2xl transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:relative md:translate-x-0 flex flex-col
            `}>
                {/* Logo Area */}
                <div className="p-8 border-b border-zinc-900/50">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-black italic tracking-tighter leading-none">
                            <span className="block text-white">IKONIC</span>
                            <span className="bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent">MARKETERS</span>
                        </h1>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] ml-1">Ad Intelligence</div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-4 px-4">Menu</div>

                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id as any)
                                setSidebarOpen(false)
                            }}
                            className={`
                                w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group
                                ${activeTab === item.id
                                    ? 'bg-gradient-to-r from-blue-600/10 to-transparent text-blue-500 border border-blue-500/10'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}
                            `}
                        >
                            <span className={`p-2 rounded-lg transition-colors ${activeTab === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
                                {item.icon}
                            </span>
                            <span className="font-medium text-sm">{item.label}</span>

                            {activeTab === item.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* Footer User Info */}
                <div className="p-4 border-t border-zinc-900 space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                            {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="text-sm font-bold text-white truncate">{profile?.full_name || 'User'}</div>
                            <div className="text-xs text-zinc-500 truncate">{profile?.email}</div>
                        </div>
                    </div>

                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-all text-xs font-bold uppercase tracking-wide shadow-lg shadow-red-600/20"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>
        </>
    )
}
