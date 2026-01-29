'use client'

import React, { useState, useEffect } from 'react'
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
    const [csrfToken, setCSRFToken] = useState('')
    const [formData, setFormData] = useState({
        full_name: user?.full_name || '',
        email: user?.email || '',
        role: user?.role || 'user',
        password: '' // Only used for new users now
    })
    const supabase = createClient()

    // Get CSRF token on component mount
    useEffect(() => {
        const fetchCSRFToken = async () => {
            try {
                const res = await fetch('/api/csrf-token')
                const data = await res.json()
                setCSRFToken(data.token)
            } catch (error) {
                console.error('Failed to fetch CSRF token:', error)
            }
        }
        fetchCSRFToken()
    }, [])

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
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken // ADD CSRF TOKEN
                },
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
            const res = await fetch(`/api/admin/users?id=${user.id}`, {
                method: 'DELETE',
                headers: {
                    'x-csrf-token': csrfToken // ADD CSRF TOKEN
                }
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            onSave()
        } catch (error: any) {
            alert('Delete failed: ' + error.message)
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in-up pb-8 sm:pb-12 px-2 sm:px-0">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
                <button
                    onClick={onBack}
                    className="group flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl border border-white/10 hover:bg-white/5 text-zinc-400 hover:text-white transition-all text-xs sm:text-sm font-bold"
                >
                    <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back to List</span>
                </button>
            </div>

            {/* Main Card */}
            <div className="bg-[#050505] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative">
                {/* Decorative Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

                {/* Top Banner */}
                <div className="h-24 sm:h-40 bg-gradient-to-r from-red-900/10 via-black to-blue-900/10 relative border-b border-white/5">
                    <div className="absolute top-2 sm:top-4 right-2 sm:right-4 animate-pulse">
                        <Activity className="text-white/10 w-16 h-16 sm:w-32 sm:h-32 opacity-20" />
                    </div>
                </div>

                <div className="px-4 sm:px-8 pb-8 sm:pb-12">
                    {/* Floating Avatar Header */}
                    <div className="relative -mt-10 sm:-mt-16 mb-8 sm:mb-12 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
                            <div className="relative">
                                <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-[#0A0A0A] p-1.5 sm:p-2 shadow-2xl ring-1 ring-white/10">
                                    <div className={`
                                        w-full h-full rounded-xl sm:rounded-2xl flex items-center justify-center text-2xl sm:text-4xl font-black text-white
                                        ${formData.role === 'admin'
                                            ? 'bg-gradient-to-br from-red-600 to-orange-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'
                                            : 'bg-gradient-to-br from-zinc-700 to-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.4)]'}
                                    `}>
                                        {formData.full_name?.[0]?.toUpperCase() || <User className="w-8 h-8 sm:w-12 sm:h-12" />}
                                    </div>
                                </div>
                                <div className={`absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 sm:border-4 border-[#050505] flex items-center justify-center ${formData.role === 'admin' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                    {formData.role === 'admin' ? <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="currentColor" /> : <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" />}
                                </div>
                            </div>

                            <div className="pb-2 space-y-1 text-center sm:text-left">
                                <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                                    {formData.full_name || 'New User'}
                                </h1>
                                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                                    <span className="text-[10px] sm:text-sm font-mono text-zinc-500 uppercase tracking-widest">
                                        ID: {user?.id?.slice(0, 8) || 'GENERATING...'}
                                    </span>
                                    <span className={`px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border ${formData.role === 'admin'
                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {formData.role === 'admin' ? 'Admin' : 'User'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
                        {/* Left Col: Main Info */}
                        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                            <div className="space-y-4 sm:space-y-6">
                                <h3 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
                                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Personal Information
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[10px] sm:text-xs font-bold text-zinc-400 ml-1">Full Name</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={formData.full_name}
                                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg sm:rounded-xl pl-3 sm:pl-4 pr-3 sm:pr-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-zinc-700 font-medium text-sm"
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 sm:space-y-2">
                                        <label className="text-[10px] sm:text-xs font-bold text-zinc-400 ml-1">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute right-3 sm:right-4 top-3 sm:top-3.5 w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 group-focus-within:text-white transition-colors pointer-events-none" />
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg sm:rounded-xl pl-3 sm:pl-4 pr-8 sm:pr-10 py-2.5 sm:py-3 text-white focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all placeholder-zinc-700 font-mono text-xs sm:text-sm disabled:opacity-50"
                                                placeholder="user@ikonic.com"
                                                required
                                                disabled={!!user}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 sm:space-y-6 pt-4">
                                <h3 className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-white/5">
                                    <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Security Configuration
                                </h3>

                                <div className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0A0A0A] border border-white/5 space-y-4 sm:space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-start">
                                        <div>
                                            <label className="block text-xs sm:text-sm font-bold text-white mb-1">Role</label>
                                            <p className="text-[10px] sm:text-xs text-zinc-500 mb-3 sm:mb-4">Determine system privileges for this account.</p>

                                            <div className="flex gap-2 p-1 bg-black rounded-lg border border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: 'user' })}
                                                    className={`flex-1 py-2 rounded-md text-[10px] sm:text-xs font-bold transition-all ${formData.role === 'user' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                                >
                                                    User
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: 'admin' })}
                                                    className={`flex-1 py-2 rounded-md text-[10px] sm:text-xs font-bold transition-all ${formData.role === 'admin' ? 'bg-red-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                                >
                                                    Admin
                                                </button>
                                            </div>
                                        </div>

                                        {isNew && (
                                            <div className="bg-red-900/10 border border-red-500/20 rounded-lg sm:rounded-xl p-3 sm:p-4">
                                                <label className="block text-[10px] sm:text-xs font-bold text-red-400 mb-2">Set Password</label>
                                                <input
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                    className="w-full bg-black/50 border border-red-500/20 rounded-lg px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:border-red-500 transition-all placeholder-red-900/50 font-mono"
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
                        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
                            <div className="bg-[#0A0A0A] border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:sticky lg:top-24">
                                <h3 className="text-white font-bold mb-4 sm:mb-6 text-sm sm:text-base">Actions</h3>

                                <div className="space-y-2 sm:space-y-3">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl bg-white text-black font-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] disabled:opacity-50 text-sm sm:text-base"
                                    >
                                        {loading ? <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> : <Save className="w-4 h-4 sm:w-5 sm:h-5" />}
                                        <span>{isNew ? 'Create User' : 'Save Changes'}</span>
                                    </button>

                                    {user && (
                                        <button
                                            type="button"
                                            onClick={handleDelete}
                                            className="w-full py-3 sm:py-4 rounded-lg sm:rounded-xl border border-red-900/30 text-red-500 hover:bg-red-900/10 hover:border-red-500/50 transition-all font-bold flex items-center justify-center gap-2 group text-sm sm:text-base"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                                            <span>Delete User</span>
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        onClick={onBack}
                                        className="w-full py-2.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all text-[10px] sm:text-xs font-bold uppercase tracking-widest"
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
