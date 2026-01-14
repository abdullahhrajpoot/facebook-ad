'use client'

import { useState } from 'react'
import { createClient } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            // Check user role
            const { data: { user } } = await supabase.auth.getUser()

            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profile?.role === 'admin') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/user/dashboard')
                }
            } else {
                router.push('/')
            }
        }
    }

    return (
        <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-[#020202] text-white font-sans selection:bg-indigo-500/30">

            {/* --- LEFT PANEL: VISUAL AMBIENCE --- */}
            <div className="hidden md:flex flex-col justify-between relative p-12 overflow-hidden border-r border-white/5 bg-black">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.15)_0%,transparent_50%)]"></div>
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

                {/* Center Visual: Security Badge */}
                <div className="relative z-10 self-center">
                    <div className="w-64 h-64 rounded-full border border-white/5 bg-white/5 backdrop-blur-md flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-[spin_10s_linear_infinite]"></div>
                        <div className="absolute inset-4 rounded-full border border-indigo-500/30 animate-[spin_15s_linear_infinite_reverse]"></div>
                        <ShieldCheck className="w-24 h-24 text-white/20" strokeWidth={1} />

                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-[10px] font-mono text-emerald-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                SECURE_GATEWAY_V4.2
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="relative z-10 max-w-md">
                    <blockquote className="text-xl font-medium leading-relaxed text-zinc-300">
                        "The only way to win is to know faster than the competition."
                    </blockquote>
                    <p className="mt-4 text-sm font-mono text-zinc-600 uppercase tracking-widest">
                        // Authorized Personnel Only
                    </p>
                </div>
            </div>

            {/* --- RIGHT PANEL: LOGIN FORM --- */}
            <div className="flex flex-col justify-center items-center p-8 md:p-24 relative bg-[#050505]">
                <div className="w-full max-w-[400px] space-y-10 animate-fade-in-up">

                    {/* Header */}
                    <div className="space-y-2 text-center md:text-left">
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                            Welcome Back.
                        </h1>
                        <p className="text-zinc-400 text-lg">
                            Enter credentials to access the terminal.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-6">

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
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-zinc-700 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                                    required
                                />
                                <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-focus-within:text-blue-500 transition-colors">Password</label>
                                <Link href="/auth/forgot-password" className="text-xs font-medium text-zinc-500 hover:text-white transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-5 py-4 text-white placeholder-zinc-700 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono"
                                    required
                                />
                                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-700 group-focus-within:text-blue-500 transition-colors" />
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
                                    <span>Initialize Session</span>
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>

                    </form>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-zinc-600">
                            Don't have clearance?{' '}
                            <Link href="/" className="text-white font-bold hover:underline decoration-blue-500 underline-offset-4 decoration-2">
                                Request Access
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
