'use client'

import { useEffect, useState } from 'react'

interface AdminSidebarProps {
    activeTab: 'users' | 'ads'
    setActiveTab: (tab: 'users' | 'ads') => void
    onSignOut: () => void
    sidebarOpen: boolean
    setSidebarOpen: (open: boolean) => void
}

export default function AdminSidebar({ activeTab, setActiveTab, onSignOut, sidebarOpen, setSidebarOpen }: AdminSidebarProps) {
    const menuItems = [
        {
            id: 'users', label: 'User Management', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
        {
            id: 'ads', label: 'Ad Campaigns', icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
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
                    <h1 className="text-3xl font-black italic tracking-tighter">
                        <span className="bg-gradient-to-r from-red-600 to-orange-500 bg-clip-text text-transparent">AD</span>
                        <span className="text-white">PULSE</span>
                    </h1>
                    <div className="text-xs font-medium text-red-500 tracking-widest mt-1 opacity-80">ADMINISTRATOR</div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                    <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-4 px-4">Main Menu</div>

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
                                    ? 'bg-gradient-to-r from-red-600/10 to-transparent text-red-500 border border-red-500/10'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}
                            `}
                        >
                            <span className={`p-2 rounded-lg transition-colors ${activeTab === item.id ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-zinc-900 group-hover:bg-zinc-800'}`}>
                                {item.icon}
                            </span>
                            <span className="font-medium text-sm">{item.label}</span>

                            {activeTab === item.id && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                            )}
                        </button>
                    ))}

                    <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wider mt-8 mb-4 px-4">System</div>
                    <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all group opacity-50 cursor-not-allowed">
                        <span className="p-2 rounded-lg bg-zinc-900 group-hover:bg-zinc-800 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </span>
                        <span className="font-medium text-sm">Settings</span>
                    </button>
                </nav>

                {/* Footer / Sign Out */}
                <div className="p-4 border-t border-zinc-900">
                    <button
                        onClick={onSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800 hover:border-zinc-700"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-semibold text-sm">Sign Out</span>
                    </button>
                    <div className="text-center mt-4 text-[10px] text-zinc-700 font-mono">
                        v1.0.4 • ADMIN BUILD
                    </div>
                </div>
            </aside>
        </>
    )
}
