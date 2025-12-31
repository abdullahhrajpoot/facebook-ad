'use client'

import { useState } from 'react'
import { createClient } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [gender, setGender] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: email.split('@')[0], // Defaulting to email prefix as name for now
                    role: 'user', // Default role
                    gender: gender,
                }
            }
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
            // Optional: Auto redirect or let them verify email
            // router.push('/auth/login') 
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Check your email</h2>
                    <p className="text-gray-300 mb-6">
                        We've sent a confirmation link to {email}.<br />Please verify your account to continue.
                    </p>
                    <Link
                        href="/auth/login"
                        className="inline-block w-full py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all font-medium"
                    >
                        Back to Login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 p-8 transform transition-all hover:scale-[1.01]">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Create Account
                    </h1>
                    <p className="text-gray-400 mt-2">Join us today</p>
                </div>

                {error && (
                    <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                placeholder="Min. 6 characters"
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Gender</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                            </div>
                            <select
                                value={gender}
                                onChange={(e) => setGender(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 rounded-lg bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none cursor-pointer"
                                required
                            >
                                <option value="" disabled className="text-gray-500 bg-zinc-900">Select Gender</option>
                                <option value="male" className="bg-zinc-900">Male</option>
                                <option value="female" className="bg-zinc-900">Female</option>
                                <option value="other" className="bg-zinc-900">Other</option>
                                <option value="prefer_not_to_say" className="bg-zinc-900">Prefer not to say</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold shadow-lg hover:shadow-purple-500/30 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Creating Account...
                            </span>
                        ) : (
                            'Sign Up'
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-400">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    )
}
