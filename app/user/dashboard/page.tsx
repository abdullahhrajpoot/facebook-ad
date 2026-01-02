'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import SearchAds from '@/components/SearchAds'
import UserSidebar from '@/components/UserSidebar'
import UserProfile from '@/components/UserProfile'
import SearchHistory from '@/components/SearchHistory'
import SavedAds from '@/components/SavedAds'

export default function UserDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'discover' | 'history' | 'saved' | 'profile'>('discover')
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const checkUser = async () => {
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

            if (!profile) {
                router.push('/auth/login')
                return
            }

            setProfile(profile)
            setLoading(false)
        }

        checkUser()
    }, [router])

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/')
    }

    const handleHistorySelect = (keyword: string, country: string, maxResults: number) => {
        setActiveTab('discover')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'discover':
                return <SearchAds />
            case 'history':
                return (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                            <h2 className="text-xl font-bold mb-6 text-white">Your Search History</h2>
                            <SearchHistory onSelect={handleHistorySelect} refreshTrigger={0} />
                        </div>
                    </div>
                )
            case 'saved':
                return <SavedAds />
            case 'profile':
                return <UserProfile profile={profile} setProfile={setProfile} />
            default:
                return null
        }
    }

    const getHeaderTitle = () => {
        switch (activeTab) {
            case 'discover': return { title: 'Ad Intelligence Search', subtitle: 'Search and analyze competitors ads across Facebook and Instagram.' }
            case 'history': return { title: 'Search History', subtitle: 'View your recent search activity.' }
            case 'saved': return { title: 'Saved Ads', subtitle: 'Your collected high-performing creatives.' }
            case 'profile': return { title: 'My Profile', subtitle: 'Manage your account settings.' }
        }
    }

    const header = getHeaderTitle()

    return (
        <div className="min-h-screen bg-black text-white flex">
            <UserSidebar
                profile={profile}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                onSignOut={handleSignOut}
                sidebarOpen={sidebarOpen}
                setSidebarOpen={setSidebarOpen}
            />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                <header className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
                    <h1 className="text-lg font-black italic tracking-tighter">
                        <span className="text-white">IKONIC</span> <span className="text-blue-500">MARKETERS</span>
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

                        <div className="animate-fade-in-up">
                            {renderContent()}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
