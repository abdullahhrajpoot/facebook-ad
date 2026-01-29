'use client'

import React, { useState, useEffect } from 'react'
import { Search, UserPlus, Filter, MoreHorizontal, Shield, Mail, Calendar, User, ChevronRight, Activity } from 'lucide-react'
import UserActionModal from '../modals/UserActionModal'

interface UsersListProps {
    users: any[]
    onSelectUser: (user: any) => void
    onAddUser: () => void
}

export default function UsersList({ users, onSelectUser, onAddUser }: UsersListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [actionUser, setActionUser] = useState<any | null>(null)
    const [csrfToken, setCSRFToken] = useState('')

    // Fetch CSRF token on mount
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

    // Filter users based on search query
    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase()
        return (
            (user.full_name?.toLowerCase() || '').includes(query) ||
            (user.email?.toLowerCase() || '').includes(query) ||
            (user.role?.toLowerCase() || '').includes(query)
        )
    })

    const handleActionClick = (e: React.MouseEvent, user: any) => {
        e.stopPropagation()
        setActionUser(user)
    }

    const handleViewProfile = (user: any) => {
        setActionUser(null)
        onSelectUser(user)
    }

    const handleDeleteUser = (userId: string) => {
        // Refresh users list - parent component will handle this
        setActionUser(null)
    }

    const handleUpdateRole = (userId: string, newRole: string) => {
        // Refresh users list - parent component will handle this
        setActionUser(null)
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-end bg-[#050505] p-2 rounded-xl sm:rounded-2xl border border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/5 skew-x-12 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none"></div>

                <div className="relative w-full sm:w-80 md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#0A0A0A] border border-white/10 rounded-lg sm:rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all font-medium text-sm"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-3 top-3 sm:top-3.5 flex gap-1">
                        <span className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></span>
                    </div>
                </div>

                <button
                    onClick={onAddUser}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-black rounded-lg sm:rounded-xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_-3px_rgba(255,255,255,0.4)] text-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    <span>Create User</span>
                </button>
            </div>

            {/* Data Grid */}
            <div className="bg-[#050505] border border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl relative min-h-[400px] sm:min-h-[500px]">
                {/* Decorative Grid BG */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

                <div className="overflow-x-auto relative z-10">
                    <table className="w-full text-left min-w-[600px]">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] font-mono">User Profile</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] font-mono">Role</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-[9px] sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] font-mono hidden sm:table-cell">Date Joined</th>
                                <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-extrabold text-zinc-500 uppercase tracking-[0.2em] font-mono">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => onSelectUser(user)}
                                        className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <div className="flex items-center gap-2.5 sm:gap-4">
                                                <div className={`
                                                    w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-bold text-sm sm:text-lg shadow-lg ring-1 ring-white/10
                                                    ${user.role === 'admin'
                                                        ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-red-500/10'
                                                        : 'bg-[#111] text-zinc-500 group-hover:bg-zinc-800 group-hover:text-zinc-300 transition-all'}
                                                `}>
                                                    {user.full_name?.[0]?.toUpperCase() || <User className="w-4 h-4 sm:w-5 sm:h-5" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-white font-bold text-xs sm:text-sm group-hover:text-red-400 transition-colors flex items-center gap-2 truncate">
                                                        {user.full_name || 'Anonymous User'}
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-zinc-600 font-mono mt-0.5 truncate">
                                                        <Mail className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                                                        <span className="truncate">{user.email}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4">
                                            <span className={`
                                                inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border
                                                ${user.role === 'admin'
                                                    ? 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_-4px_rgba(239,68,68,0.5)]'
                                                    : 'bg-zinc-800/30 text-zinc-400 border-zinc-700/30'}
                                            `}>
                                                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                                {user.role === 'admin' ? 'Admin' : 'User'}
                                            </span>
                                        </td>
                                        <td className="px-4 sm:px-6 py-3 sm:py-4 hidden sm:table-cell">
                                            <div className="flex items-center gap-2 text-[10px] sm:text-xs text-zinc-500 font-mono">
                                                <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-zinc-700" />
                                                {new Date(user.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: '2-digit',
                                                    day: '2-digit'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => handleActionClick(e, user)}
                                                className="p-2 text-zinc-600 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                            <div className="inline-flex opacity-0 group-hover:opacity-100 items-center justify-end transition-opacity duration-300 transform translate-x-2 group-hover:translate-x-0 ml-2">
                                                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-red-500" />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-50">
                                            <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 border border-zinc-800 rotate-0">
                                                <Search className="w-6 h-6 text-zinc-600" />
                                            </div>
                                            <p className="text-sm font-bold text-white uppercase tracking-widest">No matching records</p>
                                            <p className="text-xs text-zinc-500 mt-2 font-mono">Try adjusting your search terms</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Modal */}
            <UserActionModal
                user={actionUser}
                onClose={() => setActionUser(null)}
                onViewProfile={handleViewProfile}
                onDeleteUser={handleDeleteUser}
                onUpdateRole={handleUpdateRole}
                csrfToken={csrfToken}
            />
        </div>
    )
}
