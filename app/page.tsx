'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        // Optional: Redirect to login if not authenticated
        // router.push('/auth/login')
        setUser(null)
      } else {
        setUser(session.user)
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-4 w-4 bg-blue-500 rounded-full mb-2 animate-bounce"></div>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white selection:bg-blue-500/30">
      {/* Navbar */}
      <nav className="border-b border-white/10 backdrop-blur-md fixed w-full top-0 z-50 bg-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Nexus
              </span>
            </div>
            <div className="flex gap-4">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
                >
                  Sign Out
                </button>
              ) : (
                <>
                  <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Login
                  </Link>
                  <Link href="/auth/signup" className="px-4 py-2 rounded-full bg-white text-black text-sm font-bold hover:bg-gray-200 transition-colors">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-12 md:pt-48 md:pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {user ? (
            <div className="animate-fade-in-up">
              <div className="inline-block px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium mb-8">
                ● System Operational
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
                Welcome back, <br />
                <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  {user.email}
                </span>
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                Everything is working perfectly. Your authentication system is live and secure. You are now ready to build something amazing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-lg shadow-blue-500/25">
                  Go to Dashboard
                </button>
                <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10">
                  View Documentation
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">
                Get started today
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
                Build faster with <br />
                <span className="text-white">Supabase Auth</span>
              </h1>
              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                Secure, scalable, and ready to deploy. Experience the next generation of authentication integration.
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/auth/signup"
                  className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-white/10"
                >
                  Start Building
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Auth</h3>
            <p className="text-gray-400">Enterprise-grade security built right in. Your user data is protected.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/50 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
            <p className="text-gray-400">Optimized for performance with Next.js App Router and Server Components.</p>
          </div>
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <svg className="w-6 h-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Modern UI</h3>
            <p className="text-gray-400">Beautifully crafted components with Tailwind CSS and glassmorphism effects.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
