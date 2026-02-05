'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import SearchAds from '@/components/SearchAds'
import UserSidebar from '@/components/UserSidebar'
import UserProfile from '@/components/UserProfile'
import SearchHistory from '@/components/SearchHistory'
import SavedAds from '@/components/SavedAds'
import PageDiscovery from '@/components/PageDiscovery'
import useFeatureFlags from '@/utils/useFeatureFlags'

export default function UserDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'discover' | 'pages' | 'history' | 'saved' | 'profile'>('discover')
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [initialAdQuery, setInitialAdQuery] = useState<string | null>(null)

    const router = useRouter()
    const supabase = createClient()
    const { isEnabled } = useFeatureFlags()

    useEffect(() => {
        const checkUser = async (retryCount = 0) => {
            // Add delay to ensure session is established (especially important in iframe)
            await new Promise(resolve => setTimeout(resolve, 200))
            
            // Check if we're in an iframe
            const isInIframe = typeof window !== 'undefined' && window !== window.parent
            console.log('🖼️ Running in iframe:', isInIframe)
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession()

            console.log('📋 Dashboard session check:', { 
                hasSession: !!session, 
                error: sessionError?.message,
                retryCount,
                isInIframe
            })

            // If no session and we're in iframe, try to get user directly (may be in localStorage)
            if (!session && isInIframe) {
                const { data: { user }, error: userError } = await supabase.auth.getUser()
                console.log('🔄 Iframe fallback - getUser:', { hasUser: !!user, error: userError?.message })
                
                if (user) {
                    // We have a user from localStorage, fetch profile and continue
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', user.id)
                        .single()
                    
                    setProfile(profile || { id: user.id, role: 'user' })
                    setLoading(false)
                    return
                }
            }

            if (!session) {
                // Retry a few times before giving up (session might not be ready yet)
                if (retryCount < 3) {
                    console.log(`⏳ No session, retrying... (${retryCount + 1}/3)`)
                    setTimeout(() => checkUser(retryCount + 1), 500)
                    return
                }
                
                console.log('❌ No session found after retries, redirecting to login')
                // Use hard navigation for iframe compatibility
                window.location.href = '/auth/login'
                return
            }

            console.log('✅ Session found for user:', session.user.id)
            
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            console.log('👤 Profile check:', { hasProfile: !!profile, error: profileError?.message })

            if (!profile) {
                console.log('⚠️ No profile found, but user is authenticated - creating default')
                setProfile({ id: session.user.id, role: 'user' })
                setLoading(false)
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

    // State for History Navigation
    const [searchHistoryState, setSearchHistoryState] = useState<any>(null)

    const handleHistorySelect = (item: any) => {
        const type = item.filters?.type || 'ad_search'

        if (type === 'page_discovery') {
            // Only navigate to pages if feature is enabled
            if (!isEnabled('page_discovery')) {
                return // Do nothing if feature is disabled
            }
            setSearchHistoryState({
                keywords: item.keyword,
                location: item.filters?.location || '',
                limit: String(item.filters?.limit || '10')
            })
            setActiveTab('pages')
        } else {
            // Differentiate between Keyword and Page Ad Search
            const isPageMode = item.filters?.searchType === 'page'

            setSearchHistoryState({
                keyword: item.keyword,
                mode: isPageMode ? 'page' : 'keyword',
                country: item.filters?.country || 'US',
                maxResults: String(item.filters?.maxResults || item.filters?.count || '20')
            })
            setActiveTab('discover')
        }
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
                return <SearchAds initialPageQuery={initialAdQuery} initialSearchState={activeTab === 'discover' ? searchHistoryState : null} />
            case 'pages':
                // Double-check feature flag before rendering
                if (!isEnabled('page_discovery')) {
                    return <SearchAds initialPageQuery={initialAdQuery} initialSearchState={null} />
                }
                return (
                    <PageDiscovery
                        onSearchAds={(url) => {
                            setInitialAdQuery(url)
                            setActiveTab('discover')
                        }}
                        initialState={activeTab === 'pages' ? searchHistoryState : null}
                    />
                )
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
            case 'pages': return { title: 'Page Discovery', subtitle: 'Find specific business pages by industry or location.' }
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
                <header className="md:hidden flex items-center justify-between p-3 sm:p-4 border-b border-zinc-800 bg-zinc-950">
                    <h1 className="text-base sm:text-lg font-black italic tracking-tighter">
                        <span className="text-white">IKONIC</span> <span className="text-blue-500">MARKETERS</span>
                    </h1>
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-1.5 sm:p-2 text-zinc-400 hover:text-white"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto bg-black p-3 sm:p-4 md:p-8 custom-scrollbar">
                    <div className="max-w-7xl mx-auto">
                        <header className="mb-6 sm:mb-8 hidden md:block">
                            <h2 className="text-xl sm:text-2xl font-bold text-white">
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
