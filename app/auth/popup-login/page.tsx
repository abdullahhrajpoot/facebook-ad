'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { ArrowRight, Lock, Mail, X } from 'lucide-react'
import { BROADCAST_CHANNEL_NAME, type AuthMessage } from '@/utils/popupAuth'

/**
 * Popup Login Page
 * This page is opened in a popup window from an iframe.
 * After successful login, it sends the session tokens via SERVER RELAY
 * because localStorage is partitioned by top-level origin in iframes
 */
export default function PopupLoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [isPopup, setIsPopup] = useState(false)
    const [openerOrigin, setOpenerOrigin] = useState<string | null>(null)
    const [sessionId, setSessionId] = useState<string | null>(null)
    const supabase = createClient()
    const messagesSentRef = useRef(false)

    // Detect if opened as popup and get params from URL
    useEffect(() => {
        if (typeof window === 'undefined') return

        const params = new URLSearchParams(window.location.search)
        const origin = params.get('origin')
        const sid = params.get('sessionId')
        const isPopupMode = params.get('popup') === 'true' || !!origin

        setOpenerOrigin(origin)
        setSessionId(sid)
        setIsPopup(isPopupMode)

        // Log for debugging
        console.log('[PopupLogin] Mode:', { isPopupMode, origin, sessionId: sid, hasOpener: !!window.opener })
    }, [])

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (authError) {
                setError(authError.message)
                setLoading(false)
                return
            }

            if (data.session) {
                // SECURITY: Get user role from database
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.session.user.id)
                    .single()

                // Try multiple sources for role
                let userRole = 'user'
                if (profile?.role) {
                    userRole = profile.role
                    console.log('[PopupLogin] Role from profiles table:', userRole)
                } else if (data.session.user.user_metadata?.role) {
                    userRole = data.session.user.user_metadata.role
                    console.log('[PopupLogin] Role from user_metadata:', userRole)
                } else if (data.session.user.app_metadata?.role) {
                    userRole = data.session.user.app_metadata.role
                    console.log('[PopupLogin] Role from app_metadata:', userRole)
                } else {
                    console.log('[PopupLogin] No role found, defaulting to "user". Profile error:', profileError?.message)
                }

                console.log('[PopupLogin] ✓ Login success! User:', data.session.user.email, 'Role:', userRole)

                setSuccess(true)

                // If this is a popup, send message back via server relay
                if (isPopup && !messagesSentRef.current) {
                    messagesSentRef.current = true

                    const messageData: AuthMessage = {
                        type: 'POPUP_AUTH_SUCCESS',
                        accessToken: data.session.access_token,
                        refreshToken: data.session.refresh_token,
                        user: {
                            id: data.session.user.id,
                            email: data.session.user.email || '',
                            role: userRole,
                        },
                        timestamp: Date.now(),
                        sessionId: sessionId || undefined,
                    }

                    console.log('[PopupLogin] Sending auth via server relay, sessionId:', sessionId)

                    // PRIMARY METHOD: Server relay (works across partitioned storage!)
                    let serverRelaySent = false
                    if (sessionId) {
                        try {
                            const response = await fetch('/api/auth/relay', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    sessionId,
                                    authData: messageData,
                                }),
                            })
                            
                            if (response.ok) {
                                serverRelaySent = true
                                console.log('[PopupLogin] ✓ Sent via server relay!')
                            } else {
                                const err = await response.json()
                                console.log('[PopupLogin] ✗ Server relay failed:', err)
                            }
                        } catch (err) {
                            console.log('[PopupLogin] ✗ Server relay error:', err)
                        }
                    } else {
                        console.log('[PopupLogin] ⚠ No sessionId, skipping server relay')
                    }

                    // FALLBACK: BroadcastChannel (may work if same partition)
                    let bcSent = false
                    try {
                        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
                        channel.postMessage(messageData)
                        bcSent = true
                        console.log('[PopupLogin] ✓ Sent via BroadcastChannel (fallback)')
                        setTimeout(() => channel.close(), 500)
                    } catch (err) {
                        console.log('[PopupLogin] ✗ BroadcastChannel failed:', err)
                    }

                    // FALLBACK: postMessage (legacy)
                    try {
                        if (window.opener && !window.opener.closed) {
                            window.opener.postMessage(messageData, openerOrigin || '*')
                            console.log('[PopupLogin] ✓ Sent via postMessage to opener (fallback)')
                        }
                    } catch (err) {
                        console.warn('[PopupLogin] ✗ postMessage failed:', err)
                    }

                    console.log('[PopupLogin] Auth sent - Server:', serverRelaySent, 'BC:', bcSent)

                    // DON'T auto-close - let the user see the success and close manually
                    // This ensures the iframe has time to pick up the auth data
                } else {
                    // Not a popup - do normal redirect based on role
                    const redirectUrl = userRole === 'admin' ? '/admin/dashboard' : '/user/dashboard'
                    window.location.href = redirectUrl
                }
            }
        } catch (err: any) {
            setError(err.message || 'Login failed')
            setLoading(false)
        }
    }

    // Manual close handler
    const handleManualClose = () => {
        try {
            window.close()
        } catch {
            // If can't close, redirect to close page or show instruction
            alert('Please close this window manually and refresh the app.')
        }
    }

    // Listen for close requests from parent
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'POPUP_CLOSE') {
                window.close()
            }
        }
        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-4">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Login Successful!</h1>
                    {isPopup ? (
                        <>
                            <p className="text-zinc-400 text-lg">✅ You are now logged in!</p>
                            <p className="text-zinc-300 font-medium mt-2">
                                Please close this window and return to the app.
                            </p>
                            <button
                                onClick={handleManualClose}
                                className="mt-4 px-8 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center gap-2 mx-auto transition-colors"
                            >
                                <X className="w-5 h-5" />
                                <span>Close This Window</span>
                            </button>
                            <p className="text-zinc-500 text-xs mt-4">
                                The app should automatically detect your login.
                                <br />If not, please refresh the app page.
                            </p>
                        </>
                    ) : (
                        <p className="text-zinc-400">Redirecting to dashboard...</p>
                    )}
                </div>
                <div className="absolute bottom-2 right-2 text-zinc-700 text-xs">v5</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-4">
            <div className="w-full max-w-md space-y-6">
                <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Sign In</h1>
                    <p className="text-zinc-400 text-sm">Enter your credentials to continue</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    {error && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Email</label>
                        <div className="relative">
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                                required
                            />
                            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Password</label>
                        <div className="relative">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50"
                                required
                            />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 px-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>Sign In</span>
                                <ArrowRight className="w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>

                {isPopup && (
                    <p className="text-center text-zinc-500 text-xs">
                        You can close this window if you don't want to log in.
                    </p>
                )}
                <div className="absolute bottom-2 right-2 text-zinc-700 text-xs">v5</div>
            </div>
        </div>
    )
}
