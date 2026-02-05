'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../../../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Lock, Mail, ShieldCheck, ExternalLink } from 'lucide-react'
import { useAuthRedirect } from '@/utils/useAuthRedirect'
import { isInIframe } from '@/utils/iframeAuth'
import { useIframeSession } from '@/contexts/IframeSessionContext'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [inIframe, setInIframe] = useState(false)
    const [popupBlocked, setPopupBlocked] = useState(false)
    const router = useRouter()
    const supabase = createClient()
    const { setSessionFromPopup, navigateWithAuth, isAuthenticated, isLoading: isSessionLoading } = useIframeSession()

    // Check if in iframe on mount
    useEffect(() => {
        const iframe = isInIframe()
        setInIframe(iframe)
    }, [])

    // Redirect if already authenticated (via context)
    useEffect(() => {
        if (!isSessionLoading && isAuthenticated && inIframe) {
            console.log('[Login] Already authenticated in iframe context, redirecting...')
            navigateWithAuth('/user/dashboard')
        }
    }, [isAuthenticated, inIframe, isSessionLoading, navigateWithAuth])

    // Redirect if already authenticated (normal flow)
    const { isLoading: isAuthChecking } = useAuthRedirect()

    // Handle popup auth for iframe context
    const handlePopupLogin = () => {
        setLoading(true)
        setError(null)
        setPopupBlocked(false)

        // Import dynamically to avoid issues with hook usage
        import('@/utils/popupAuth').then(({ openAuthPopup, LOCALSTORAGE_AUTH_KEY }) => {
            // Also poll localStorage as backup (in case BroadcastChannel fails)
            let authHandled = false
            const pollInterval = setInterval(() => {
                if (authHandled) return
                try {
                    const storedAuth = localStorage.getItem(LOCALSTORAGE_AUTH_KEY)
                    if (storedAuth) {
                        const data = JSON.parse(storedAuth)
                        if (data?.type === 'POPUP_AUTH_SUCCESS' && data.accessToken && data.user) {
                            authHandled = true
                            clearInterval(pollInterval)
                            console.log('[Login] Found auth in localStorage (backup poll):', data.user.email)
                            
                            // Store tokens in session context
                            setSessionFromPopup(data.accessToken, data.refreshToken, data.user)
                            
                            // Clear localStorage
                            localStorage.removeItem(LOCALSTORAGE_AUTH_KEY)
                            
                            // Redirect
                            const redirectUrl = data.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                            navigateWithAuth(redirectUrl)
                        }
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }, 300)

            const popup = openAuthPopup(
                (user, tokens) => {
                    if (authHandled) return
                    authHandled = true
                    clearInterval(pollInterval)
                    
                    // Store tokens in session context (also saves to persistent storage)
                    console.log('[Login] Popup auth success:', user.email, 'Role:', user.role)
                    setSessionFromPopup(tokens.accessToken, tokens.refreshToken, user)

                    // Redirect based on role - admin goes to admin dashboard, others go to user dashboard
                    const redirectUrl = user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                    console.log('[Login] Redirecting to:', redirectUrl, '(role was:', user.role, ')')
                    navigateWithAuth(redirectUrl)
                },
                (error) => {
                    clearInterval(pollInterval)
                    setError(error)
                    setLoading(false)
                },
                () => {
                    // Popup closed - wait a moment and check localStorage one more time
                    setTimeout(() => {
                        if (authHandled) return
                        clearInterval(pollInterval)
                        
                        try {
                            const storedAuth = localStorage.getItem(LOCALSTORAGE_AUTH_KEY)
                            if (storedAuth) {
                                const data = JSON.parse(storedAuth)
                                if (data?.type === 'POPUP_AUTH_SUCCESS' && data.accessToken && data.user) {
                                    authHandled = true
                                    console.log('[Login] Found auth after popup close:', data.user.email)
                                    
                                    setSessionFromPopup(data.accessToken, data.refreshToken, data.user)
                                    localStorage.removeItem(LOCALSTORAGE_AUTH_KEY)
                                    
                                    const redirectUrl = data.user.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                                    navigateWithAuth(redirectUrl)
                                    return
                                }
                            }
                        } catch (e) {}
                        
                        // No auth found
                        setLoading(false)
                    }, 500)
                }
            )

            if (!popup) {
                clearInterval(pollInterval)
                setPopupBlocked(true)
                setLoading(false)
            }
        })
    }

    // Regular form login (for non-iframe or as fallback)
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()

        // If in iframe, use popup auth instead
        if (inIframe) {
            handlePopupLogin()
            return
        }

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

                // Use window.location for iframe-safe navigation
                if (profile?.role === 'admin') {
                    window.location.href = '/admin/dashboard'
                } else {
                    window.location.href = '/user/dashboard'
                }
            } else {
                window.location.href = '/'
            }
        }
    }

    // Show loading state while checking auth
    if (isAuthChecking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                    <p className="text-zinc-400 text-sm">Verifying access...</p>
                </div>
            </div>
        )
    }

    // Special popup-based login UI for iframe
    if (inIframe) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-3">
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20">
                            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-white">Welcome Back</h1>
                        <p className="text-zinc-400">Click below to sign in securely</p>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    {popupBlocked && (
                        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-sm">
                            <p className="font-bold mb-1">Popup Blocked</p>
                            <p>Please allow popups for this site to sign in, or use the link below to open in a new window.</p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            onClick={handlePopupLogin}
                            disabled={loading}
                            className="w-full py-4 px-6 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-lg shadow-xl"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>
                                    <ExternalLink className="w-5 h-5" />
                                    <span>Sign In</span>
                                </>
                            )}
                        </button>

                        <div className="text-center">
                            <a
                                href="/auth/login"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-400 text-sm flex items-center justify-center gap-1"
                            >
                                <span>Open login in new window</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <p className="text-zinc-400 text-xs">
                            A secure popup window will open for you to enter your credentials. This ensures your login works securely within this app.
                        </p>
                    </div>

                    <p className="text-center text-zinc-500 text-sm">
                        Don't have an account?{' '}
                        <a href="/auth/signup" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">
                            Sign up
                        </a>
                    </p>
                </div>
            </div>
        )
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
            <div className="flex flex-col justify-center items-center p-6 sm:p-8 md:p-24 relative bg-[#050505] min-h-screen md:min-h-0">
                <div className="w-full max-w-[400px] space-y-8 sm:space-y-10 animate-fade-in-up">

                    {/* Header */}
                    <div className="space-y-2 text-center md:text-left">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white">
                            Welcome Back.
                        </h1>
                        <p className="text-zinc-400 text-base sm:text-lg">
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
                            <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500 group-focus-within:text-blue-500 transition-colors">Email Address</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="agent@ikonic.com"
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-white placeholder-zinc-700 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm sm:text-base"
                                    required
                                />
                                <Mail className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-zinc-500 group-focus-within:text-blue-500 transition-colors">Password</label>
                                <Link href="/auth/forgot-password" className="text-[10px] sm:text-xs font-medium text-zinc-500 hover:text-white transition-colors">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl px-4 sm:px-5 py-3 sm:py-4 text-white placeholder-zinc-700 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-sm sm:text-base"
                                    required
                                />
                                <Lock className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-700 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 sm:h-14 rounded-full bg-white text-black font-bold text-base sm:text-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_30px_-5px_rgba(255,255,255,0.3)] mt-4"
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
