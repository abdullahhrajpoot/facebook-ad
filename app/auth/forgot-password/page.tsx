'use client'

import React, { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { checkEmail } from './actions'
import { ArrowRight, Mail, CheckCircle2, ChevronLeft, ShieldAlert } from 'lucide-react'

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
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#020202] text-white font-sans selection:bg-indigo-500/30">

            {/* --- LEFT PANEL: VISUAL AMBIENCE --- */}
            <div className="hidden md:flex flex-col justify-between relative p-12 overflow-hidden border-r border-white/5 bg-black">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.15)_0%,transparent_50%)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] opacity-50"></div>

                {/* Header / Logo */}
                <div className="relative z-10">
                    <Link href="/" className="flex items-center gap-3 w-fit group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10 group-hover:scale-105 transition-transform duration-300">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-lg font-black italic tracking-tighter text-white drop-shadow-md">IKONIC</span>
                            <span className="text-lg font-black italic tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent filter drop-shadow-sm">MARKETERS</span>
                        </div>
                    </Link>
                </div>

                {/* Center Visual: Lock Animation */}
                <div className="relative z-10 self-center">
                    <div className="w-64 h-64 rounded-full border border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-[spin_20s_linear_infinite]"></div>
                        <ShieldAlert className="w-24 h-24 text-white/20" strokeWidth={1} />

                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono text-purple-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
                                RECOVERY_MODE_ACTIVE
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="relative z-10 max-w-md">
                    <blockquote className="text-xl font-medium leading-relaxed text-zinc-300">
                        "Security is not a product, but a process."
                    </blockquote>
                    <p className="mt-4 text-sm font-mono text-zinc-600 uppercase tracking-widest">
                        // Identity Verification Required
                    </p>
                </div>
            </div>

            {/* --- RIGHT PANEL: FORM --- */}
            <div className="flex flex-col justify-center items-center p-8 md:p-24 relative bg-[#050505]">
                <div className="w-full max-w-[400px] space-y-10 animate-fade-in-up">

                    {/* Header */}
                    <div className="space-y-2 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                            Recovery.
                        </h1>
                        <p className="text-zinc-400 text-lg">
                            Enter registered email to reset clearances.
                        </p>
                    </div>

                    {success ? (
                        <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-6">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">Link Dispatched</h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    We have sent a secure recovery link to <span className="text-white font-mono">{email}</span>. Please check your inbox.
                                </p>
                            </div>
                            <button
                                onClick={() => setSuccess(false)}
                                className="text-sm font-bold text-emerald-500 hover:text-emerald-400 transition-colors uppercase tracking-wider"
                            >
                                Try Different Email
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">

                            {error && (
                                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-sm font-bold">
                                    <span className="p-1 rounded-full bg-red-500/20">!</span>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2 group">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-focus-within:text-blue-500 transition-colors">Email Address</label>
                                <div className="relative">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="agent@ikonic.com"
                                        className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-zinc-700 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono"
                                        required
                                    />
                                    <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-purple-500 transition-colors" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full h-14 rounded-full bg-white text-black font-bold text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] mt-4"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>Send Recovery Link</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="text-center">
                        <Link href="/auth/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-medium">
                            <ChevronLeft className="w-4 h-4" />
                            Return to Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
