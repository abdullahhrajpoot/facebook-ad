'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import SearchAds from '@/components/SearchAds'
import AdminSidebar from '@/components/AdminSidebar'
import UsersList from '@/components/admin/UsersList'
import AdminUserProfile from '@/components/admin/AdminUserProfile'

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'users' | 'ads'>('users')

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    const renderContent = () => {
        if (activeTab === 'users') {
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
        } else {
            return <SearchAds />
        }
    }

    return (
        <div className="min-h-screen bg-black text-white flex">
            {/* Sidebar */}
            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={(tab) => {
                    setActiveTab(tab)
                    // Reset sub-views when switching main tabs
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
                                {activeTab === 'users' ? 'User Management' : 'Global Ad Campaigns'}
                            </h2>
                            <p className="text-gray-500 text-sm mt-1">
                                {activeTab === 'users' ? 'Manage system access and user profiles.' : 'Monitor and manage all advertisements across the platform.'}
                            </p>
                        </header>

                        {/* Content */}
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    )
}
