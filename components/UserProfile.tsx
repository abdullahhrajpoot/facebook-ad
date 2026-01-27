'use client'

interface UserProfileProps {
    profile: any
    setProfile: (profile: any) => void
}

export default function UserProfile({ profile }: UserProfileProps) {
    return (
        <div className="max-w-2xl mx-auto px-2 sm:px-0">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6 sm:mb-8">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg shadow-blue-500/20">
                        {profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="text-center sm:text-left">
                        <h2 className="text-xl sm:text-2xl font-bold text-white">My Profile</h2>
                        <p className="text-gray-400 text-xs sm:text-sm">View your personal information.</p>
                    </div>
                </div>

                <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                        <div>
                            <label className="block text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1.5 sm:mb-2">Email Address</label>
                            <input
                                type="email"
                                value={profile?.email || ''}
                                disabled
                                className="w-full bg-black/50 border border-zinc-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-zinc-400 cursor-not-allowed text-sm sm:text-base"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1.5 sm:mb-2">Full Name</label>
                            <input
                                type="text"
                                value={profile?.full_name || ''}
                                disabled
                                className="w-full bg-black/50 border border-zinc-800 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-zinc-400 cursor-not-allowed text-sm sm:text-base"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] sm:text-xs uppercase font-bold text-gray-500 mb-1.5 sm:mb-2">Role</label>
                        <div className="inline-block px-2.5 sm:px-3 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs sm:text-sm font-medium">
                            {profile?.role?.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
