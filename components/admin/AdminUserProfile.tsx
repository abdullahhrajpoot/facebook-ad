'use client'

import { useState } from 'react'
import { createClient } from '../../utils/supabase/client'

interface AdminUserProfileProps {
    user: any | null // null means creating a new user
    onBack: () => void
    onSave: () => void // Trigger refresh in parent
}

export default function AdminUserProfile({ user, onBack, onSave }: AdminUserProfileProps) {
    const isNew = !user // Determine if strict creation mode

    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        role: user?.role || 'user',
        password: '' // Only used for new users now
    })
    const supabase = createClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const method = isNew ? 'POST' : 'PUT'
            const body: any = { ...formData }

            // If editing, remove password from body to prevent accidental reset (though backend should handle this safely too)
            if (!isNew) {
                body.id = user.id
                delete body.password
            }

            const res = await fetch('/api/admin/users', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            const data = await res.json()

            if (!res.ok) throw new Error(data.error)

            onSave() // Refresh and go back
        } catch (error: any) {
            alert('Operation failed: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!user || !window.confirm('Are you ABSOLUTELY SURE? This will permanently delete the user and all their data.')) return

        try {
            setLoading(true)
            const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onSave()
        } catch (error: any) {
            alert('Delete failed: ' + error.message)
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={onBack}
                    className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-white">
                        {user ? 'Manage User Profile' : 'Create New User'}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {user ? `Editing details for ${user.email}` : 'Add a new user to the system.'}
                    </p>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                {/* User Banner / Avatar Area */}
                <div className="h-32 bg-gradient-to-r from-zinc-800 to-zinc-900 relative">
                    <div className="absolute -bottom-10 left-8">
                        <div className="w-24 h-24 rounded-2xl bg-black p-1">
                            <div className={`w-full h-full rounded-xl flex items-center justify-center text-3xl font-bold text-white ${formData.role === 'admin' ? 'bg-gradient-to-br from-red-600 to-orange-600' : 'bg-gradient-to-br from-blue-600 to-indigo-600'}`}>
                                {formData.full_name?.[0]?.toUpperCase() || (formData.email?.[0]?.toUpperCase()) || '?'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-16 pb-8 px-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Account Details</h3>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-700"
                                        placeholder="user@company.com"
                                        required
                                        disabled={!!user}
                                    />
                                    {user && <p className="text-[10px] text-zinc-600 mt-1">Email cannot be changed directly.</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-400 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-700"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Permissions & Info</h3>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2">Role</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer hover:border-zinc-700"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Conditionally Render Password Input ONLY for New Users */}
                                {isNew && (
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-400 mb-2">
                                            Password <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all placeholder-zinc-700"
                                            placeholder="Set initial password"
                                            required
                                            minLength={6}
                                        />
                                        <p className="text-[10px] text-zinc-600 mt-1">
                                            Required for creating a new account.
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-8 border-t border-zinc-800 flex items-center justify-between gap-4">
                            {user && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-6 py-3 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all font-bold text-sm"
                                >
                                    Delete User
                                </button>
                            )}
                            <div className="flex gap-4 ml-auto">
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="px-6 py-3 rounded-xl border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {loading ? 'Saving...' : (isNew ? 'Create User' : 'Save Changes')}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
