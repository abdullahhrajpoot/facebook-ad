'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import SearchAds from '../../../components/SearchAds'

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<'users' | 'ads'>('users')
    const [users, setUsers] = useState<any[]>([])
    const [editingUser, setEditingUser] = useState<any>(null)
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

    const handleDeleteUser = async (userId: string) => {
        if (!window.confirm('Are you sure? This action cannot be undone.')) return

        try {
            const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            setUsers(users.filter(u => u.id !== userId))
        } catch (error: any) {
            alert('Failed to delete user: ' + error.message)
        }
    }

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingUser) return

        const isNew = !editingUser.id
        const method = isNew ? 'POST' : 'PUT'

        try {
            const res = await fetch('/api/admin/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editingUser)
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            // Refresh list
            fetchData()
            setEditingUser(null)
        } catch (error: any) {
            alert(`Failed to ${isNew ? 'create' : 'update'} user: ` + error.message)
        }
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
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">All Users</h3>
                                <button
                                    onClick={() => setEditingUser({})}
                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    <span>+</span> Create User
                                </button>
                            </div>
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
                                                        onClick={() => setEditingUser(user)}
                                                        className="text-blue-500 hover:text-blue-400 hover:bg-blue-500/10 px-3 py-1 rounded transition-colors mr-2"
                                                    >
                                                        Edit
                                                    </button>
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
                    <SearchAds />
                )}

            </div>
            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-6">{editingUser.id ? 'Edit User' : 'Create User'}</h2>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            {!editingUser.id && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={editingUser.email || ''}
                                            onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
                                        <input
                                            type="password"
                                            value={editingUser.password || ''}
                                            onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={editingUser.full_name || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Gender</label>
                                <select
                                    value={editingUser.gender || ''}
                                    onChange={(e) => setEditingUser({ ...editingUser, gender: e.target.value })}
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
                                <select
                                    value={editingUser.role || 'user'}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
