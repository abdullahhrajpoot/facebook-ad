'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MOCK_ADS } from '../utils/mockData'
import AdCard from '../components/AdCard'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setUser(null)
        setProfile(null)
        setLoading(false)
      } else {
        setUser(session.user)
        // Check role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        setProfile(profile)
        setLoading(false)
        if (profile?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/user/dashboard')
        }
      }
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex flex-col items-center">
          {/* Custom Loader */}
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-zinc-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
          </div>
          <div className="mt-4 text-zinc-500 font-medium animate-pulse">Loading...</div>
        </div>
      </div>
    )
  }

  // Determine dashboard link based on role
  const dashboardLink = user
    ? (profile?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard')
    : '/auth/login'

  return (
    <div className="min-h-screen bg-black text-white relative overflow-x-hidden selection:bg-blue-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 blur-[150px] rounded-full animate-pulse-slow delay-1000"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30%] h-[30%] bg-cyan-500/5 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 glass border-b-0 border-white/5 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 flex items-center gap-3 group cursor-default">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-black font-sans tracking-tight">
                IKONIC <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">MARKETERS</span>
              </span>
            </div>

            <div className="flex gap-4">
              <Link href="/auth/login" className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5">
                Log In
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-tight animate-fade-in-up">
            Uncover Winning <br />
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
              Ad Strategies
            </span>
          </h1>
          <p className="mt-4 text-xl text-zinc-400 max-w-3xl mx-auto mb-10 animate-fade-in-up delay-100">
            Stop guessing. Start scaling. Analyze millions of successful ad campaigns to find your next winning creative instantly.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up delay-200">
            <Link
              href={dashboardLink}
              className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:bg-zinc-200 transition-all shadow-xl shadow-white/10 hover:shadow-white/20 transform hover:-translate-y-1 flex items-center gap-2"
            >
              Continue to Dashboard
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-black/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Competitor Analysis', desc: 'See exactly what creatives your competitors are running.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
              { title: 'Global Coverage', desc: 'Access ad data from over 150+ countries worldwide.', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
              { title: 'Trend Discovery', desc: 'Identify rising trends before they become saturated.', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' }
            ].map((feature, i) => (
              <div key={i} className="glass-card p-8 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all hover:-translate-y-1 group">
                <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trending Section Preview */}
      <div className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-bold">Trending Campaigns</h2>
            <p className="text-zinc-400 mt-2">Recently discovered high-performing ads.</p>
          </div>
          <Link href="/auth/login" className="hidden md:flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors">
            View All Ads
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Marquee/Grid Effect */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity duration-500">
            {MOCK_ADS.slice(0, 4).map((ad, i) => (
              <div key={i} className="pointer-events-none select-none">
                <AdCard ad={ad} />
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-zinc-500 text-sm">
            © 2024 Ikonic Marketers Inc. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Terms</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
