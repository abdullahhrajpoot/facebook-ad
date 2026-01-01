'use client'

interface UserProfileProps {
    profile: any
    setProfile: (profile: any) => void
}

export default function UserProfile({ profile }: UserProfileProps) {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
                        {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">My Profile</h2>
                        <p className="text-gray-400 text-sm">View your personal information.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Email Address</label>
                            <input
                                type="email"
                                value={profile?.email || ''}
                                disabled
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Full Name</label>
                            <input
                                type="text"
                                value={profile?.full_name || ''}
                                disabled
                                className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Gender</label>
                        <input
                            type="text"
                            value={profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : 'Not specified'}
                            disabled
                            className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-400 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-xs uppercase font-bold text-gray-500 mb-2">Role</label>
                        <div className="inline-block px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-sm font-medium">
                            {profile?.role?.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
