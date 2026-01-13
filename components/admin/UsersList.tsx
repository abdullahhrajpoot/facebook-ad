'use client'

import { useState } from 'react'
import { Search, UserPlus, Filter, MoreHorizontal, Shield, Mail, Calendar, User } from 'lucide-react'
import UserActionModal from '../modals/UserActionModal'

interface UsersListProps {
    users: any[]
    onSelectUser: (user: any) => void
    onAddUser: () => void
}

export default function UsersList({ users, onSelectUser, onAddUser }: UsersListProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [actionUser, setActionUser] = useState<any | null>(null)

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
        // Implementation for delete would go here (API call)
        console.log('Deleting user:', userId)
        setActionUser(null)
        // Ideally trigger a refresh or optimistically update
    }

    const handleUpdateRole = (userId: string, newRole: string) => {
        // Implementation for role update would go here (API call)
        console.log('Updating role for:', userId, 'to', newRole)
        setActionUser(null)
        // Ideally trigger a refresh
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
                <div className="relative w-full md:w-96 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-4 border border-white/5 rounded-2xl leading-5 bg-black/40 backdrop-blur-md text-white placeholder-zinc-500 focus:outline-none focus:bg-zinc-900/60 focus:border-red-500/50 focus:ring-4 focus:ring-red-900/10 transition-all shadow-xl"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={onAddUser}
                    className="w-full md:w-auto bg-gradient-to-br from-white to-zinc-200 hover:from-white hover:to-white text-black px-6 py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl hover:shadow-white/10 flex items-center justify-center gap-2 active:scale-95"
                >
                    <UserPlus className="w-5 h-5" />
                    <span>Create User</span>
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-zinc-900/30 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/5">
                                <th className="px-8 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">User Profile</th>
                                <th className="px-6 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Role Access</th>
                                <th className="px-6 py-5 text-xs font-bold text-zinc-400 uppercase tracking-widest">Date Joined</th>
                                <th className="px-6 py-5 text-right text-xs font-bold text-zinc-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => onSelectUser(user)}
                                        className="hover:bg-white/5 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`
                                                    w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg ring-1 ring-white/10
                                                    ${user.role === 'admin'
                                                        ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white shadow-red-500/20'
                                                        : 'bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white transition-all'}
                                                `}>
                                                    {user.full_name?.[0]?.toUpperCase() || <User className="w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold text-base group-hover:text-red-400 transition-colors">
                                                        {user.full_name || 'Anonymous User'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500 mt-0.5">
                                                        <Mail className="w-3 h-3" />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`
                                                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                                                ${user.role === 'admin'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-zinc-800 text-zinc-300 border-zinc-700'}
                                            `}>
                                                <Shield className="w-3 h-3" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                                                <Calendar className="w-4 h-4 text-zinc-600" />
                                                {new Date(user.created_at).toLocaleDateString(undefined, {
                                                    month: 'long',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <button
                                                onClick={(e) => handleActionClick(e, user)}
                                                className="p-2 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 outline-none focus:opacity-100 focus:translate-x-0"
                                            >
                                                <MoreHorizontal className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                                <Search className="w-8 h-8 text-zinc-600" />
                                            </div>
                                            <p className="text-lg font-bold text-white">No users found</p>
                                            <p className="text-sm text-zinc-500 mt-1">Try adjusting your search terms.</p>
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
            />
        </div>
    )
}
