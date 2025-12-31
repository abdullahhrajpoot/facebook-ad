'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { MOCK_ADS } from '../../../utils/mockData'
import AdCard from '../../../components/AdCard'

export default function UserDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const router = useRouter()

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/auth/login')
                return
            }

            // Fetch profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()

            if (profile?.role === 'admin') {
                router.push('/admin/dashboard')
                return
            }

            setProfile(profile)
            setLoading(false)
        }

        checkUser()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                <nav className="flex justify-between items-center mb-12">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg font-bold">
                            {profile?.full_name ? profile.full_name[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold leading-tight">Dashboard</h1>
                            <p className="text-gray-400 text-xs">Welcome back, {profile?.full_name || 'User'}</p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut()
                            router.push('/')
                        }}
                        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors border border-zinc-700"
                    >
                        Sign Out
                    </button>
                </nav>

                {/* Dashboard Content */}
                <div>
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                        Available Ad Campaigns
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {MOCK_ADS.map((ad) => (
                            <AdCard key={ad.id} ad={ad} />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
