'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import { MOCK_ADS } from '../../../utils/mockData'
import AdCard from '../../../components/AdCard'

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'users' | 'ads'>('users')
    const [users, setUsers] = useState<any[]>([]) // Mock user list state
    const router = useRouter()

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

            if (profile?.role !== 'admin') {
                router.push('/user/dashboard')
                return
            }

            setProfile(profile)

            // Fetch users for CRUD (Using profiles table as proxy)
            const { data: fetchedUsers } = await supabase.from('profiles').select('*')
            if (fetchedUsers) setUsers(fetchedUsers)

            setLoading(false)
        }

        checkUser()
    }, [router])

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you sure? This is a permanent action.')) return
        // Optimistic update for UI
        setUsers(users.filter(u => u.id !== userId))
        alert('User deleted (Simulated - Requires Service Role for Auth User deletion)')
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                            AdPulse Admin
                        </h1>
                        <p className="text-gray-500 mt-1">Manage users and monitor global ad performance</p>
                    </div>

                    <button
                        onClick={async () => {
                            await supabase.auth.signOut()
                            router.push('/')
                        }}
                        className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

                {/* Tab Nav */}
                <div className="flex gap-6 border-b border-zinc-800 mb-8">
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'users' ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        User Management
                    </button>
                    <button
                        onClick={() => setActiveTab('ads')}
                        className={`pb-4 px-2 font-medium transition-colors border-b-2 ${activeTab === 'ads' ? 'border-red-500 text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        Ad Campaigns
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'users' ? (
                    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm text-gray-400">
                                    <thead className="bg-zinc-950 uppercase font-medium">
                                        <tr>
                                            <th className="px-6 py-3">User</th>
                                            <th className="px-6 py-3">Role</th>
                                            <th className="px-6 py-3">Gender</th>
                                            <th className="px-6 py-3">Joined</th>
                                            <th className="px-6 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        {users.map((user) => (
                                            <tr key={user.id} className="hover:bg-zinc-800/50 transition-colors group">
                                                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                        {user.email?.[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-white">{user.full_name || 'No Name'}</div>
                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 capitalize">{user.gender || '-'}</td>
                                                <td className="px-6 py-4">{new Date(user.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 px-3 py-1 rounded transition-colors"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {MOCK_ADS.map((ad) => (
                            <AdCard key={ad.id} ad={ad} />
                        ))}
                    </div>
                )}

            </div>
        </div>
    )
}
