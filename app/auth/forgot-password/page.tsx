'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { checkEmail } from './actions'

export default function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email.trim()) return

        setLoading(true)
        setError(null)
        setSuccess(false)

        try {
            // 1. Verify email exists (Server Action)
            const exists = await checkEmail(email)
            if (!exists) {
                setError("No account found with this email address.")
                setLoading(false)
                return
            }

            // 2. Proceed with Reset
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
            })

            if (error) {
                setError(error.message)
            } else {
                setSuccess(true)
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setLoading(false)
        }
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
                        Recover Access.
                    </h1>
                    <p className="text-lg text-zinc-400 leading-relaxed">
                        Don't worry, even the best of us forget. We'll get you back into your account in seconds.
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
                        <h2 className="text-3xl font-bold tracking-tight text-white">Forgot Password?</h2>
                        <p className="text-zinc-400">
                            Enter your email address and we'll send you a link to reset your password.
                        </p>
                    </div>

                    {success ? (
                        <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center space-y-4 border-green-500/20 bg-green-500/5">
                            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-white">Check your email</h3>
                                <p className="text-zinc-400 text-sm">
                                    We sent a password reset link to <span className="text-white font-medium">{email}</span>
                                </p>
                            </div>
                            <button
                                onClick={() => setSuccess(false)}
                                className="text-sm text-zinc-500 hover:text-white transition-colors underline"
                            >
                                Try another email
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-sm text-red-500 font-medium">{error}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label htmlFor="email" className="block text-sm font-medium text-zinc-400">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-all font-sans"
                                        placeholder="name@example.com"
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-zinc-600">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
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
                                        Sending Link...
                                    </span>
                                ) : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <div className="text-center pt-4">
                        <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors group">
                            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
