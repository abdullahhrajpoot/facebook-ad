'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, User, Shield, Trash2, ExternalLink, Mail, Calendar, AlertTriangle } from 'lucide-react'

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
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
                onClick={handleBackdropClick}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-sm bg-[#050505] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5">

                {/* Decorative Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

                {/* Header */}
                <div className="h-20 bg-gradient-to-r from-red-900/20 to-black relative border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="absolute -bottom-6 left-6 flex items-end">
                        <div className={`
                            w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl shadow-xl ring-4 ring-[#050505] relative z-10
                            ${user.role === 'admin'
                                ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white'
                                : 'bg-[#151515] text-white border border-white/10'}
                        `}>
                            {user.full_name?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
                        </div>
                    </div>
                </div>

                <div className="pt-8 px-6 pb-6 relative z-10">
                    {/* User Info */}
                    <div className="mb-8 pl-0.5">
                        <h2 className="text-xl font-black text-white tracking-tight">{user.full_name || 'Unknown User'}</h2>
                        <div className="flex flex-col gap-1 mt-2">
                            <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
                                <Mail className="w-3 h-3" />
                                {user.email}
                            </div>
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
                                <Calendar className="w-3 h-3" />
                                Joined {new Date(user.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="space-y-3">
                        {/* View Profile Button */}
                        <button
                            onClick={() => onViewProfile(user)}
                            className="w-full group flex items-center justify-between p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
                                    <User className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-sm font-bold text-gray-200">View Profile</span>
                                    <span className="block text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Full Details</span>
                                </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </button>

                        {/* Role Toggle */}
                        <div className="w-full p-1 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between pl-3.5 pr-1.5 py-1.5 h-[72px]">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-zinc-800/30 text-zinc-400 border-white/5'}`}>
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div className="text-left">
                                    <div className="text-sm font-bold text-gray-200">Role</div>
                                    <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{user.role === 'admin' ? 'Administrator' : 'Standard User'}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => onUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')}
                                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider bg-black hover:bg-white text-white hover:text-black border border-white/10 rounded-lg transition-all h-full"
                            >
                                {user.role === 'admin' ? 'Revoke' : 'Promote'}
                            </button>
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-2">
                            {!isDeleting ? (
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="w-full group flex items-center justify-between p-3.5 bg-red-900/5 hover:bg-red-900/20 border border-red-500/10 hover:border-red-500/30 rounded-xl transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                            <Trash2 className="w-4 h-4" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-sm font-bold text-red-500 group-hover:text-red-400">Delete User</span>
                                            <span className="block text-[10px] text-red-500/50 group-hover:text-red-500/70 font-mono uppercase tracking-wider">Permanently Remove</span>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-2 mb-3 text-red-500">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-widest">Delete User</span>
                                    </div>
                                    <p className="text-[11px] text-red-300/70 mb-4 leading-relaxed">
                                        This action cannot be undone. All data associated with this user will be permanently erased.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setIsDeleting(false)}
                                            className="h-10 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-400 text-xs font-bold transition-colors uppercase tracking-wider"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => onDeleteUser(user.id)}
                                            className="h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider"
                                        >
                                            Confirm
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}
