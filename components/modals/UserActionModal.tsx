'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Shield, Trash2, ExternalLink, CheckCircle, Mail, Calendar } from 'lucide-react'

interface UserActionModalProps {
    user: any
    onClose: () => void
    onViewProfile: (user: any) => void
    onDeleteUser: (userId: string) => void
    onUpdateRole: (userId: string, newRole: string) => void
}

export default function UserActionModal({ user, onClose, onViewProfile, onDeleteUser, onUpdateRole }: UserActionModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        setMounted(true)
        // Prevent body scroll
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [])

    if (!mounted || !user) return null

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose()
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
                onClick={handleBackdropClick}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-zinc-950/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5">

                {/* Header / Banner */}
                <div className="h-24 bg-gradient-to-r from-red-900/40 to-orange-900/40 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white/70 hover:text-white rounded-full transition-colors backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 pb-6 -mt-10 relative">
                    {/* User Avatar */}
                    <div className="flex justify-center mb-4">
                        <div className={`
                            w-20 h-20 rounded-2xl flex items-center justify-center font-bold text-3xl shadow-xl ring-4 ring-zinc-950
                            ${user.role === 'admin'
                                ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white'
                                : 'bg-zinc-800 text-zinc-400'}
                        `}>
                            {user.full_name?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-bold text-white">{user.full_name || 'Anonymous User'}</h2>
                        <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm mt-1">
                            <Mail className="w-3.5 h-3.5" />
                            {user.email}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-zinc-500 text-xs mt-1">
                            <Calendar className="w-3 h-3" />
                            Joined {new Date(user.created_at).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="space-y-3">
                        {/* View Profile Button */}
                        <button
                            onClick={() => onViewProfile(user)}
                            className="w-full h-12 bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 hover:border-white/10 rounded-xl flex items-center justify-between px-4 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <User className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-zinc-200">View Full Profile</span>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </button>

                        {/* Role Toggle */}
                        <div className="w-full p-4 bg-zinc-900/50 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${user.role === 'admin' ? 'bg-orange-500/10 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-medium text-zinc-200">User Role</div>
                                    <div className="text-xs text-zinc-500">{user.role === 'admin' ? 'Administrator' : 'Standard User'}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => onUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                                className="px-3 py-1.5 text-xs font-bold bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-white transition-colors"
                            >
                                {user.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                        </div>

                        {/* Danger Zone */}
                        {!isDeleting ? (
                            <button
                                onClick={() => setIsDeleting(true)}
                                className="w-full h-12 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-xl flex items-center justify-between px-4 transition-all group mt-4"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-red-200 group-hover:text-red-100">Delete User</span>
                                </div>
                            </button>
                        ) : (
                            <div className="mt-4 p-1 bg-red-500/10 border border-red-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
                                <p className="text-center text-xs text-red-300 font-medium py-2">Are you sure?</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setIsDeleting(false)}
                                        className="h-9 rounded-lg bg-transparent hover:bg-red-500/10 text-red-300 text-xs font-bold transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => onDeleteUser(user.id)}
                                        className="h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-500/20 transition-all"
                                    >
                                        Confirm
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
