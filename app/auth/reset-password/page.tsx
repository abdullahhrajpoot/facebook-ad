'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ResetPassword() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    // Optional: Validate that the session is valid (recovery type)
    // But usually supabase client on load will recover the session from the URL hash.

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)
        setError(null)

        const supabase = createClient()

        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            setSuccess(true)
            setLoading(false)
            // Redirect after delay
            setTimeout(() => {
                router.push('/auth/login')
            }, 3000)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-6">
                <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                        <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Password Updated!</h2>
                    <p className="text-zinc-400 mb-8">
                        Your password has been successfully reset. You can now log in with your new password.
                    </p>
                    <div className="space-y-4">
                        <Link
                            href="/auth/login"
                            className="block w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl"
                        >
                            Log In Now
                        </Link>
                        <p className="text-sm text-zinc-600">Redirecting in 3 seconds...</p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
            {/* Left Side - Visual */}
            <div className="hidden md:flex flex-col justify-between bg-zinc-900 border-r border-zinc-800 p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-zinc-900 opacity-20 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>

                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-2 group w-fit">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white group-hover:bg-blue-500 transition-colors">
                            I
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white group-hover:text-zinc-200 transition-colors">Ikonic</span>
                    </Link>
                </div>

                <div className="relative z-10 space-y-6 max-w-lg">
                    <h1 className="text-4xl font-bold tracking-tight text-white">
                        Secure Your Account.
                    </h1>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Choose a strong password to protect your data. We recommend using a mix of letters, numbers, and symbols.
                    </p>
                </div>

                <div className="relative z-10 text-sm text-zinc-600 font-mono">
                    © 2024 Ikonic Marketers. All rights reserved.
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex flex-col items-center justify-center p-6 md:p-12 bg-black relative">
                {/* Mobile Header */}
                <div className="md:hidden absolute top-6 left-6">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white">
                            I
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">Ikonic</span>
                    </Link>
                </div>

                <div className="w-full max-w-md space-y-8 animate-fade-in-up">
                    <div className="text-center md:text-left space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-white">Set New Password</h2>
                        <p className="text-zinc-400">
                            Please enter your new password below.
                        </p>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-sm text-red-500 font-medium">{error}</p>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label htmlFor="password" className="block text-sm font-medium text-zinc-400">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-sans"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-400">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirmPassword"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={6}
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-sans"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-black" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Updating...
                                </span>
                            ) : 'Update Password'}
                        </button>
                    </form>

                    <div className="text-center pt-4">
                        <p className="text-zinc-500 text-sm">
                            Remember your password? <Link href="/auth/login" className="text-white hover:underline">Log in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
