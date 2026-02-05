'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import SearchAds from '@/components/SearchAds'
import AdminSidebar from '@/components/AdminSidebar'
import UsersList from '@/components/admin/UsersList'
import AdminUserProfile from '@/components/admin/AdminUserProfile'
import UserProfile from '@/components/UserProfile'
import SearchHistory from '@/components/SearchHistory'

import SavedAds from '@/components/SavedAds'
import PageDiscovery from '@/components/PageDiscovery'
import AdminSettings from '@/components/admin/AdminSettings'
import useFeatureFlags from '@/utils/useFeatureFlags'
import { useIframeSession } from '@/contexts/IframeSessionContext'
import { createClient } from '@/utils/supabase/client'

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'users' | 'ads' | 'saved' | 'history' | 'profile' | 'pagediscovery' | 'settings'>('users')

    // Data State
    const [users, setUsers] = useState<any[]>([])

    // View State for Users Tab
    const [userViewMode, setUserViewMode] = useState<'list' | 'detail'>('list')
    const [selectedUser, setSelectedUser] = useState<any | null>(null) // null when creating new

    const [sidebarOpen, setSidebarOpen] = useState(false)

    const router = useRouter()
    const { isEnabled } = useFeatureFlags()
    const { user, isLoading: isAuthLoading, signOut, isAuthenticated, supabaseClient: supabase } = useIframeSession()

    useEffect(() => {
        fetchData()
    }, [isAuthLoading, isAuthenticated, user, router])

    const fetchData = async () => {
        if (isAuthLoading) return

        if (!isAuthenticated || !user) {
            router.push('/auth/login')
            return
        }

        // Fetch profile
        if (!profile) {
            const { data: userProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (userProfile?.role !== 'admin') {
                router.push('/user/dashboard')
                return
            }

            setProfile(userProfile)
        }

        // Fetch users
        const { data: fetchedUsers } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (fetchedUsers) setUsers(fetchedUsers)
        setLoading(false)
    }

    const handleSignOut = async () => {
        await signOut()
        router.push('/')
    }

    // User Navigation Handlers
    const handleUserSelect = (user: any) => {
        setSelectedUser(user)
        setUserViewMode('detail')
    }

    const handleAddUser = () => {
        setSelectedUser(null)
        setUserViewMode('detail')
    }

    const handleUserBack = () => {
        setUserViewMode('list')
        setSelectedUser(null)
    }

    const handleUserSave = () => {
        fetchData() // Refresh list
        setUserViewMode('list')
        setSelectedUser(null)
    }

    // State for History Navigation
    const [searchHistoryState, setSearchHistoryState] = useState<any>(null)

    // ... (existing code)

    const handleHistorySelect = (item: any) => {
        const type = item.filters?.type || 'ad_search'

        if (type === 'page_discovery') {
            // Only navigate to pagediscovery if feature is enabled
            if (!isEnabled('page_discovery')) {
                return // Do nothing if feature is disabled
            }
            setSearchHistoryState({
                keywords: item.keyword,
                location: item.filters?.location || '',
                limit: String(item.filters?.limit || '10')
            })
            setActiveTab('pagediscovery')
        } else {
            // Differentiate between Keyword and Page Ad Search
            const isPageMode = item.filters?.searchType === 'page'

            setSearchHistoryState({
                keyword: item.keyword,
                mode: isPageMode ? 'page' : 'keyword',
                country: item.filters?.country || 'US',
                maxResults: String(item.filters?.maxResults || item.filters?.count || '20')
            })
            setActiveTab('ads')
        }
    }

    if (isAuthLoading || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'users':
                if (userViewMode === 'detail') {
                    return (
                        <AdminUserProfile
                            user={selectedUser}
                            onBack={handleUserBack}
                            onSave={handleUserSave}
                        />
                    )
                }
                return (
                    <UsersList
                        users={users}
                        onSelectUser={handleUserSelect}
                        onAddUser={handleAddUser}
                    />
                )
            case 'ads':
                return <SearchAds initialSearchState={activeTab === 'ads' ? searchHistoryState : null} />
            case 'saved':
                return <SavedAds />
            case 'history':
                return (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-6 text-white">Admin Search History</h2>
                            <SearchHistory onSelect={handleHistorySelect} refreshTrigger={0} />
                        </div>
                    </div>
                )
            case 'profile':
                return <UserProfile profile={profile} setProfile={setProfile} />
            case 'pagediscovery':
                // Double-check feature flag before rendering
                if (!isEnabled('page_discovery')) {
                    return <SearchAds initialSearchState={null} />
                }
                return (
                    <PageDiscovery
                        onSearchAds={(query) => {
                            setSearchHistoryState({
                                keyword: query,
                                mode: 'page',
                                country: 'US',
                                maxResults: '20'
                            })
                            setActiveTab('ads')
                        }}
                        initialState={activeTab === 'pagediscovery' ? searchHistoryState : null}
                    />
                )
            case 'settings':
                return <AdminSettings />
            default:
                return null
        }
    }

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'users': return { title: 'User Management', subtitle: 'Manage system access and user profiles.' }
            case 'ads': return { title: 'Global Ad Campaigns', subtitle: 'Monitor and manage all advertisements across the platform.' }
            case 'saved': return { title: 'Saved Library', subtitle: 'Curated collection of high-performing ads.' }
            case 'history': return { title: 'Search History', subtitle: 'Review past search queries and activity.' }
            case 'profile': return { title: 'My Profile', subtitle: 'View your administrator account details.' }
            case 'pagediscovery': return { title: 'Page Discovery', subtitle: 'Find new Facebook pages to analyze.' }
            case 'settings': return { title: 'System Settings', subtitle: 'Configure platform features and system options.' }
        }
    }

    const header = getHeaderTitle()

    return (
        <div className="min-h-screen bg-transparent text-white flex overflow-hidden">
            {/* Sidebar */}
            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab)
                    if (tab === 'users') setUserViewMode('list')
                }}
                onSignOut={handleSignOut}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Background Glow Effects */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-red-900/10 to-transparent pointer-events-none" />

                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-3 sm:p-4 border-b border-white/5 bg-black/40 backdrop-blur-md relative z-20">
                    <h1 className="text-base sm:text-lg font-black italic tracking-tighter">
                        <span className="text-white">IKONIC</span> <span className="text-red-500">MARKETERS</span>
                    </h1>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto custom-scrollbar p-0 relative z-10">
                    {/* Header Section */}
                    <div className="sticky top-0 z-30 bg-black/40 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 md:px-8 py-4 sm:py-6 mb-6 sm:mb-8">
                        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between sm:items-end gap-3 sm:gap-0">
                            <div className="animate-slide-in-right" key={activeTab}>
                                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
                                    {header?.title}
                                </h2>
                                <p className="text-zinc-400 text-xs sm:text-sm mt-1 font-medium">
                                    {header?.subtitle}
                                </p>
                            </div>

                            {/* Profile Snippet / Quick Actions could go here */}
                            <div className="hidden md:flex items-center gap-4">
                                <div className="px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold tracking-wider uppercase animate-pulse-slow">
                                    System Active
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-8 pb-8 sm:pb-12">
                        {/* Content */}
                        <div className="animate-fade-in-up">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
