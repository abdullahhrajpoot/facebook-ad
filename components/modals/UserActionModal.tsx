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
    csrfToken?: string
    accessToken?: string // For Bearer auth in iframe contexts
}

export default function UserActionModal({ user, onClose, onViewProfile, onDeleteUser, onUpdateRole, csrfToken = '', accessToken = '' }: UserActionModalProps) {
    const [mounted, setMounted] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [isUpdatingRole, setIsUpdatingRole] = useState(false)

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
            <div className="relative w-full max-w-[calc(100%-2rem)] sm:max-w-sm bg-[#050505] border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 ring-1 ring-white/5">

                {/* Decorative Grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none"></div>

                {/* Header */}
                <div className="h-16 sm:h-20 bg-gradient-to-r from-red-900/20 to-black relative border-b border-white/5">
                    <button
                        onClick={onClose}
                        className="absolute top-2 sm:top-3 right-2 sm:right-3 p-1.5 sm:p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <div className="absolute -bottom-5 sm:-bottom-6 left-4 sm:left-6 flex items-end">
                        <div className={`
                            w-12 h-12 sm:w-16 sm:h-16 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-xl sm:text-2xl shadow-xl ring-[3px] sm:ring-4 ring-[#050505] relative z-10
                            ${user.role === 'admin'
                                ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white'
                                : 'bg-[#151515] text-white border border-white/10'}
                        `}>
                            {user.full_name?.[0]?.toUpperCase() || <User className="w-6 h-6 sm:w-8 sm:h-8" />}
                        </div>
                    </div>
                </div>

                <div className="pt-6 sm:pt-8 px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
                    {/* User Info */}
                    <div className="mb-6 sm:mb-8 pl-0.5">
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">{user.full_name || 'Unknown User'}</h2>
                        <div className="flex flex-col gap-0.5 sm:gap-1 mt-1.5 sm:mt-2">
                            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-400 text-[10px] sm:text-xs font-mono">
                                <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span className="truncate">{user.email}</span>
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 text-zinc-500 text-[10px] sm:text-xs font-mono">
                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                Joined {new Date(user.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    {/* Actions Grid */}
                    <div className="space-y-2 sm:space-y-3">
                        {/* View Profile Button */}
                        <button
                            onClick={() => onViewProfile(user)}
                            className="w-full group flex items-center justify-between p-3 sm:p-3.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 rounded-lg sm:rounded-xl transition-all"
                        >
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/10">
                                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="text-left">
                                    <span className="block text-xs sm:text-sm font-bold text-gray-200">View Profile</span>
                                    <span className="block text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Full Details</span>
                                </div>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </button>

                        {/* Role Toggle */}
                        <div className="w-full p-1 bg-white/[0.03] border border-white/5 rounded-lg sm:rounded-xl flex items-center justify-between pl-3 sm:pl-3.5 pr-1 sm:pr-1.5 py-1 sm:py-1.5 min-h-[60px] sm:h-[72px]">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center border ${user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/10' : 'bg-zinc-800/30 text-zinc-400 border-white/5'}`}>
                                    <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </div>
                                <div className="text-left">
                                    <div className="text-xs sm:text-sm font-bold text-gray-200">Role</div>
                                    <div className="text-[9px] sm:text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{user.role === 'admin' ? 'Administrator' : 'Standard User'}</div>
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    setIsUpdatingRole(true)
                                    try {
                                        const res = await fetch('/api/admin/users', {
                                            method: 'PUT',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'x-csrf-token': csrfToken,
                                                ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
                                            },
                                            credentials: 'include',
                                            body: JSON.stringify({
                                                id: user.id,
                                                role: user.role === 'admin' ? 'user' : 'admin'
                                            })
                                        })
                                        if (res.ok) {
                                            onUpdateRole(user.id, user.role === 'admin' ? 'user' : 'admin')
                                        } else {
                                            alert('Failed to update role')
                                        }
                                    } catch (error) {
                                        alert('Error updating role')
                                    } finally {
                                        setIsUpdatingRole(false)
                                    }
                                }}
                                disabled={isUpdatingRole}
                                className="px-2.5 sm:px-3 py-1.5 sm:py-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider bg-black hover:bg-white text-white hover:text-black border border-white/10 rounded-lg transition-all disabled:opacity-50"
                            >
                                {isUpdatingRole ? 'Updating...' : (user.role === 'admin' ? 'Revoke' : 'Promote')}
                            </button>
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-1 sm:pt-2">
                            {!isDeleting ? (
                                <button
                                    onClick={() => setIsDeleting(true)}
                                    className="w-full group flex items-center justify-between p-3 sm:p-3.5 bg-red-900/5 hover:bg-red-900/20 border border-red-500/10 hover:border-red-500/30 rounded-lg sm:rounded-xl transition-all"
                                >
                                    <div className="flex items-center gap-2.5 sm:gap-3">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </div>
                                        <div className="text-left">
                                            <span className="block text-xs sm:text-sm font-bold text-red-500 group-hover:text-red-400">Delete User</span>
                                            <span className="block text-[9px] sm:text-[10px] text-red-500/50 group-hover:text-red-500/70 font-mono uppercase tracking-wider">Permanently Remove</span>
                                        </div>
                                    </div>
                                </button>
                            ) : (
                                <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg sm:rounded-xl animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 text-red-500">
                                        <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">Delete User</span>
                                    </div>
                                    <p className="text-[10px] sm:text-[11px] text-red-300/70 mb-3 sm:mb-4 leading-relaxed">
                                        This action cannot be undone. All data associated with this user will be permanently erased.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => setIsDeleting(false)}
                                            className="h-9 sm:h-10 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-400 text-[10px] sm:text-xs font-bold transition-colors uppercase tracking-wider"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`/api/admin/users?id=${user.id}`, {
                                                        method: 'DELETE',
                                                        headers: {
                                                            'x-csrf-token': csrfToken,
                                                            ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
                                                        },
                                                        credentials: 'include'
                                                    })
                                                    if (res.ok) {
                                                        onDeleteUser(user.id)
                                                        onClose()
                                                    } else {
                                                        alert('Failed to delete user')
                                                    }
                                                } catch (error) {
                                                    alert('Error deleting user')
                                                }
                                            }}
                                            className="h-9 sm:h-10 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] sm:text-xs font-bold shadow-lg shadow-red-900/20 transition-all uppercase tracking-wider disabled:opacity-50"
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
