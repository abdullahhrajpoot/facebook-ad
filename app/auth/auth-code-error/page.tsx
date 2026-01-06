'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

function AuthErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    return (
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Authentication Error</h2>
            {error && (
                <div className="mb-4 text-red-400 bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-sm font-mono break-all">
                    {error}
                </div>
            )}
            <p className="text-zinc-400 mb-8">
                Since the link is invalid or expired, we can't log you in. Please try resetting your password again.
            </p>
            <div className="space-y-4">
                <Link
                    href="/auth/forgot-password"
                    className="block w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                    Try Again
                </Link>
                <Link
                    href="/auth/login"
                    className="block w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3.5 rounded-xl transition-all"
                >
                    Back to Login
                </Link>
            </div>
        </div>
    )
}

export default function AuthCodeError() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <AuthErrorContent />
            </Suspense>
        </div>
    )
}
