'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function DiagnosticsPage() {
    const [diagnostics, setDiagnostics] = useState<any>(null)
    const [testing, setTesting] = useState(false)

    useEffect(() => {
        const runDiagnostics = async () => {
            const results: any = {
                timestamp: new Date().toISOString(),
                env: {
                    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ MISSING',
                    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ MISSING',
                },
                browser: {
                    userAgent: navigator.userAgent,
                    url: window.location.href,
                },
            }

            try {
                const supabase = createClient()
                
                // Test 1: Check current session
                const { data: { session }, error: sessionError } = await supabase.auth.getSession()
                results.currentSession = {
                    hasSession: !!session,
                    user: session?.user?.email || null,
                    error: sessionError?.message,
                }

                // Test 2: Test connection to Supabase
                try {
                    const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true })
                    results.supabaseConnection = {
                        working: !error,
                        error: error?.message || null,
                    }
                } catch (e) {
                    results.supabaseConnection = {
                        working: false,
                        error: (e as Error).message,
                    }
                }

                // Test 3: Check auth status
                try {
                    const { data: { user }, error } = await supabase.auth.getUser()
                    results.authUser = {
                        authenticated: !!user,
                        email: user?.email || null,
                        error: error?.message,
                    }
                } catch (e) {
                    results.authUser = {
                        authenticated: false,
                        error: (e as Error).message,
                    }
                }
            } catch (e) {
                results.error = (e as Error).message
            }

            setDiagnostics(results)
        }

        runDiagnostics()
    }, [])

    const testLogin = async () => {
        setTesting(true)
        const supabase = createClient()

        try {
            const testEmail = 'test@example.com'
            const testPassword = 'testpassword123'

            console.log('Testing login with:', testEmail)
            const { data, error } = await supabase.auth.signInWithPassword({
                email: testEmail,
                password: testPassword,
            })

            setDiagnostics((prev: any) => ({
                ...prev,
                testLogin: {
                    attempted: true,
                    email: testEmail,
                    success: !error,
                    error: error?.message || 'Success',
                    userId: data?.user?.id,
                },
            }))
        } catch (e) {
            setDiagnostics((prev: any) => ({
                ...prev,
                testLogin: {
                    attempted: true,
                    error: (e as Error).message,
                },
            }))
        } finally {
            setTesting(false)
        }
    }

    return (
        <div className="min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">🔧 Auth Diagnostics</h1>

                {diagnostics ? (
                    <div className="space-y-6">
                        <section className="bg-zinc-900 p-6 rounded-lg">
                            <h2 className="text-xl font-bold mb-4">Environment Variables</h2>
                            <div className="space-y-2 font-mono text-sm">
                                <div>NEXT_PUBLIC_SUPABASE_URL: {diagnostics.env.supabaseUrl}</div>
                                <div>NEXT_PUBLIC_SUPABASE_ANON_KEY: {diagnostics.env.supabaseKey}</div>
                            </div>
                        </section>

                        <section className="bg-zinc-900 p-6 rounded-lg">
                            <h2 className="text-xl font-bold mb-4">Current Session</h2>
                            <div className="space-y-2 font-mono text-sm">
                                <div>Has Session: {diagnostics.currentSession?.hasSession ? '✅' : '❌'}</div>
                                <div>User Email: {diagnostics.currentSession?.user || 'None'}</div>
                                {diagnostics.currentSession?.error && (
                                    <div className="text-red-400">Error: {diagnostics.currentSession.error}</div>
                                )}
                            </div>
                        </section>

                        <section className="bg-zinc-900 p-6 rounded-lg">
                            <h2 className="text-xl font-bold mb-4">Supabase Connection</h2>
                            <div className="space-y-2 font-mono text-sm">
                                <div>
                                    Connected: {diagnostics.supabaseConnection?.working ? '✅' : '❌'}
                                </div>
                                {diagnostics.supabaseConnection?.error && (
                                    <div className="text-red-400">Error: {diagnostics.supabaseConnection.error}</div>
                                )}
                            </div>
                        </section>

                        <section className="bg-zinc-900 p-6 rounded-lg">
                            <h2 className="text-xl font-bold mb-4">Auth Status</h2>
                            <div className="space-y-2 font-mono text-sm">
                                <div>Authenticated: {diagnostics.authUser?.authenticated ? '✅' : '❌'}</div>
                                <div>Email: {diagnostics.authUser?.email || 'None'}</div>
                                {diagnostics.authUser?.error && (
                                    <div className="text-red-400">Error: {diagnostics.authUser.error}</div>
                                )}
                            </div>
                        </section>

                        {diagnostics.testLogin && (
                            <section className="bg-zinc-900 p-6 rounded-lg border border-yellow-500">
                                <h2 className="text-xl font-bold mb-4">Test Login Result</h2>
                                <div className="space-y-2 font-mono text-sm">
                                    <div>Email: {diagnostics.testLogin.email}</div>
                                    <div>Status: {diagnostics.testLogin.success ? '✅ Success' : '❌ Failed'}</div>
                                    <div>{diagnostics.testLogin.error}</div>
                                    {diagnostics.testLogin.userId && (
                                        <div className="text-green-400">User ID: {diagnostics.testLogin.userId}</div>
                                    )}
                                </div>
                            </section>
                        )}

                        <button
                            onClick={testLogin}
                            disabled={testing}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-900 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            {testing ? 'Testing...' : 'Test Login with Default Credentials'}
                        </button>

                        <div className="bg-blue-900 p-4 rounded-lg text-sm">
                            <p className="font-bold mb-2">💡 How to use this page:</p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Check if environment variables are set</li>
                                <li>Verify Supabase connection is working</li>
                                <li>Check current authentication status</li>
                                <li>Click "Test Login" to verify auth flow (uses test@example.com)</li>
                                <li>Check browser console for detailed logs</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                        <p>Running diagnostics...</p>
                    </div>
                )}
            </div>
        </div>
    )
}
