'use client'

import React, { useState } from 'react'
import { createClient } from '../../utils/supabase/client'
import { ArrowLeft, Trash2, Save, User, Mail, Shield, Lock, Activity, CheckCircle2 } from 'lucide-react'

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
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-sm font-bold"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to List</span>
                </button>
            </div>

            {/* Main Card */}
            <div className="bg-[#050505] border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Decorative Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

                {/* Top Banner */}
                <div className="h-40 bg-gradient-to-r from-red-900/10 via-black to-blue-900/10 relative border-b border-white/5">
                    <div className="absolute top-4 right-4 animate-pulse">
                        <Activity className="text-white/10 w-32 h-32 opacity-20" />
                    </div>
                </div>

                <div className="px-8 pb-12">
                    {/* Floating Avatar Header */}
                    <div className="relative -mt-16 mb-12 flex items-end justify-between">
                        <div className="flex items-end gap-6">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-3xl bg-[#0A0A0A] p-2 shadow-2xl ring-1 ring-white/10">
                                    <div className={`
                                        w-full h-full rounded-2xl flex items-center justify-center text-4xl font-black text-white
                                        ${formData.role === 'admin'
                                            ? 'bg-gradient-to-br from-red-600 to-orange-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'
                                            : 'bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'}
                                    `}>
                                        {formData.full_name?.[0]?.toUpperCase() || <User className="w-12 h-12" />}
                                    </div>
                                </div>
                                <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full border-4 border-[#050505] flex items-center justify-center ${formData.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                    {formData.role === 'admin' ? <Shield className="w-3 h-3 text-white" fill="currentColor" /> : <CheckCircle2 className="w-3 h-3 text-white" />}
                                </div>
                            </div>

                            <div className="pb-2 space-y-1">
                                <h1 className="text-3xl font-black text-white tracking-tight">
                                    {formData.full_name || 'New User'}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono text-zinc-500 uppercase tracking-widest">
                                        ID: {user?.id?.slice(0, 8) || 'GENERATING...'}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${formData.role === 'admin'
                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {formData.role === 'admin' ? 'Admin' : 'User'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Left Col: Main Info */}
                        <div className="lg:col-span-2 space-y-8">
                            <div className="space-y-6">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
                                    <User className="w-4 h-4" /> Personal Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-400 ml-1">Full Name</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-4 pr-4 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-zinc-700 font-medium"
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-400 ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute right-4 top-3.5 w-4 h-4 text-zinc-600 group-focus-within:text-white transition-colors pointer-events-none" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl pl-4 pr-10 py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-zinc-700 font-mono text-sm disabled:opacity-50"
                                                placeholder="user@ikonic.com"
                                                required
                                                disabled={!!user}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 pt-4">
                                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
                                    <Lock className="w-4 h-4" /> Security Configuration
                                </h3>

                                <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        <div>
                                            <label className="block text-sm font-bold text-white mb-1">Role</label>
                                            <p className="text-xs text-zinc-500 mb-4">Determine system privileges for this account.</p>

                                            <div className="flex gap-2 p-1 bg-black rounded-lg border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: 'user' })}
                                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${formData.role === 'user' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                                >
                                                    User
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                                                    className={`flex-1 py-2 rounded-md text-xs font-bold transition-all ${formData.role === 'admin' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                                >
                                                    Admin
                                                </button>
                                            </div>
                                        </div>

                                        {isNew && (
                                            <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-4">
                                                <label className="block text-xs font-bold text-red-400 mb-2">Set Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full bg-black/50 border border-red-500/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500 transition-all placeholder-red-900/50 font-mono"
                                                    placeholder="••••••••"
                                                    required
                                                    minLength={6}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Col: Actions */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 sticky top-24">
                                <h3 className="text-white font-bold mb-6">Actions</h3>

                                <div className="space-y-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 rounded-xl bg-white text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] disabled:opacity-50"
                                    >
                                        {loading ? <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                                        <span>{isNew ? 'Create User' : 'Save Changes'}</span>
                                    </button>

                                    {user && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="w-full py-4 rounded-xl border border-red-900/30 text-red-500 hover:bg-red-900/10 hover:border-red-500/50 transition-all font-bold flex items-center justify-center gap-2 group"
                                        >
                                            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                            <span>Delete User</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={onBack}
                                        className="w-full py-3 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
