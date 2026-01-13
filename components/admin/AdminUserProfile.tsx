'use client'

import { useState } from 'react'
import { createClient } from '../../utils/supabase/client'
import { ArrowLeft, Trash2, Save, User, Mail, Shield, Lock, AlertTriangle } from 'lucide-react'

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
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-12">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onBack}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all group"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-white tracking-tight">
                        {user ? 'Edit Profile' : 'New User Account'}
                    </h2>
                    <p className="text-zinc-400 text-sm font-medium">
                        {user ? `Managing access and details for ${user.email}` : 'Configure credentials for a new system user.'}
                    </p>
                </div>
            </div>

            {/* Profile Card */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
                {/* User Banner / Avatar Area */}
                <div className="h-48 bg-gradient-to-r from-red-900/20 via-zinc-900/40 to-blue-900/20 relative">
                    <div className="absolute inset-x-8 -bottom-12 flex items-end justify-between">
                        <div className="flex items-end gap-6">
                            <div className="w-24 h-24 rounded-3xl bg-black p-1.5 shadow-2xl ring-4 ring-black">
                                <div className={`
                                    w-full h-full rounded-2xl flex items-center justify-center text-4xl font-black text-white shadow-inner
                                    ${formData.role === 'admin'
                                        ? 'bg-gradient-to-br from-red-600 to-orange-600'
                                        : 'bg-gradient-to-br from-white to-zinc-400 text-black'}
                                `}>
                                    {formData.full_name?.[0]?.toUpperCase() || <User className="w-10 h-10" />}
                                </div>
                            </div>
                            <div className="pb-2">
                                <h1 className="text-2xl font-bold text-white mb-0.5">
                                    {formData.full_name || 'Unnamed User'}
                                </h1>
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${formData.role === 'admin'
                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                        : 'bg-white/10 text-white border-white/10'
                                    }`}>
                                    <Shield className="w-3 h-3" />
                                    {formData.role === 'admin' ? 'Administrator' : 'Standard User'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-20 pb-12 px-8">
                    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">
                                    <User className="w-4 h-4" /> Account Details
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 mb-2 ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all placeholder-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                placeholder="user@example.com"
                                                required
                                                disabled={!!user}
                                            />
                                        </div>
                                        {user && <p className="text-[10px] text-zinc-500 mt-1.5 ml-1 flex items-center gap-1"><Lock className="w-3 h-3" /> Identity Locked</p>}
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 mb-2 ml-1">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-3.5 w-4 h-4 text-zinc-500 group-focus-within:text-white transition-colors" />
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all placeholder-zinc-700"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-2">
                                    <Shield className="w-4 h-4" /> Security & Access
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-400 mb-2 ml-1">Role Permission</label>
                                        <div className="relative">
                                            <select
                                                value={formData.role}
                                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                                className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer hover:bg-white/5"
                                            >
                                                <option value="user">Standard User</option>
                                                <option value="admin">Administrator (Full Access)</option>
                                            </select>
                                            <div className="absolute right-4 top-3.5 pointer-events-none text-zinc-500 text-xs">▼</div>
                                        </div>
                                    </div>

                                    {/* Conditionally Render Password Input ONLY for New Users */}
                                    {isNew && (
                                        <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 space-y-3">
                                            <label className="block text-xs font-bold text-red-400 ml-1">
                                                Set Initial Password
                                            </label>
                                            <div className="relative group">
                                                <Lock className="absolute left-4 top-3.5 w-4 h-4 text-red-500/50 group-focus-within:text-red-500 transition-colors" />
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full bg-black/40 border border-red-500/20 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all placeholder-red-900/30"
                                                    placeholder="••••••••"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                            <p className="text-[10px] text-red-400/60 font-medium">
                                                Must be at least 6 characters.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="pt-8 border-t border-white/5 flex items-center justify-between gap-4">
                            {user ? (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="px-5 py-3 rounded-xl bg-red-500/5 text-red-500 border border-red-500/10 hover:bg-red-500 hover:text-white transition-all font-bold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Account
                                </button>
                            ) : <div />}

                            <div className="flex gap-3 ml-auto">
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="px-6 py-3 rounded-xl border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white transition-all font-bold text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center gap-2 active:scale-95"
                                >
                                    {loading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <Save className="w-4 h-4" />
                                    )}
                                    <span>{isNew ? 'Create Account' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
