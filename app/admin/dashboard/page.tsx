'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import SearchAds from '@/components/SearchAds'
import AdminSidebar from '@/components/AdminSidebar'
import UsersList from '@/components/admin/UsersList'
import AdminUserProfile from '@/components/admin/AdminUserProfile'
import UserProfile from '@/components/UserProfile'
import SearchHistory from '@/components/SearchHistory'

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'users' | 'ads' | 'history' | 'profile'>('users')

    // Data State
    const [users, setUsers] = useState<any[]>([])

    // View State for Users Tab
    const [userViewMode, setUserViewMode] = useState<'list' | 'detail'>('list')
    const [selectedUser, setSelectedUser] = useState<any | null>(null) // null when creating new

    const [sidebarOpen, setSidebarOpen] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        fetchData()
    }, [router])

    const fetchData = async () => {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            router.push('/auth/login')
            return
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

        if (profile?.role !== 'admin') {
            router.push('/user/dashboard')
            return
        }

        setProfile(profile)

        // Fetch users
        const { data: fetchedUsers } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })

        if (fetchedUsers) setUsers(fetchedUsers)
        setLoading(false)
    }

    const handleSignOut = async () => {
        await supabase.auth.signOut()
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

    const handleHistorySelect = (keyword: string, country: string, maxResults: number) => {
        setActiveTab('ads')
        // In a real app, you'd pass filters to SearchAds here, possibly via context or URL params
    }

    if (loading) {
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
                return <SearchAds />
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
            default:
                return null
        }
    }

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'users': return { title: 'User Management', subtitle: 'Manage system access and user profiles.' }
            case 'ads': return { title: 'Global Ad Campaigns', subtitle: 'Monitor and manage all advertisements across the platform.' }
            case 'history': return { title: 'Search History', subtitle: 'Review past search queries and activity.' }
            case 'profile': return { title: 'My Profile', subtitle: 'View your administrator account details.' }
        }
    }

    const header = getHeaderTitle()

    return (
        <div className="min-h-screen bg-black text-white flex">
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
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                    <h1 className="text-xl font-bold italic tracking-tighter">
                        <span className="text-red-500">AD</span>PULSE
                    </h1>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-zinc-400 hover:text-white"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto bg-black p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <header className="mb-8 hidden md:block">
                            <h2 className="text-2xl font-bold text-white">
                                {header?.title}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {header?.subtitle}
                            </p>
                        </header>

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
