'use client'

import { useState } from 'react'

interface UsersListProps {
    users: any[]
    onSelectUser: (user: any) => void
    onAddUser: () => void
}

export default function UsersList({ users, onSelectUser, onAddUser }: UsersListProps) {
    const [searchQuery, setSearchQuery] = useState('')

    // Filter users based on search query
    const filteredUsers = users.filter(user => {
        const query = searchQuery.toLowerCase()
        return (
            (user.full_name?.toLowerCase() || '').includes(query) ||
            (user.email?.toLowerCase() || '').includes(query) ||
            (user.role?.toLowerCase() || '').includes(query)
        )
    })

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-3 border border-zinc-800 rounded-xl leading-5 bg-zinc-900 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-black focus:border-red-500 focus:ring-1 focus:ring-red-500 sm:text-sm transition-all shadow-inner"
                        placeholder="Search users by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    onClick={onAddUser}
                    className="w-full md:w-auto bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add User</span>
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                        <thead className="bg-black/50 uppercase font-bold text-xs tracking-wider text-zinc-500 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-5">User Profile</th>
                                <th className="px-6 py-5">Role</th>
                                <th className="px-6 py-5">Gender</th>
                                <th className="px-6 py-5">Joined</th>
                                <th className="px-6 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => onSelectUser(user)}
                                        className="hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                                    >
                                        <td className="px-6 py-4 font-medium text-white">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${user.role === 'admin' ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-zinc-800 text-zinc-400 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-blue-600/20 transition-all'}`}>
                                                    {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold text-base group-hover:text-blue-400 transition-colors">{user.full_name || 'No Name'}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${user.role === 'admin' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 capitalize">{user.gender || '-'}</td>
                                        <td className="px-6 py-4 font-mono text-zinc-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest mr-2">Manage</span>
                                                <svg className="w-5 h-5 text-zinc-500 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                            </svg>
                                            <p className="text-lg font-medium text-zinc-400">No users found</p>
                                            <p className="text-sm">Try adjusting your search terms.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
