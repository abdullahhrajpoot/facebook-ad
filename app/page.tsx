'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MOCK_ADS } from '../utils/mockData'
import AdCard from '../components/AdCard'

export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setUser(null)
      } else {
        setUser(session.user)
        // Check role and redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile?.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/user/dashboard')
        }
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
            <div className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xl font-bold font-sans">
                AdPulse
              </span>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login" className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="/auth/signup" className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-bold hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/25">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-12 md:pt-48 md:pb-32 px-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-blue-500/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8 animate-fade-in">
            New: Real-time Ad Tracking API
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 animate-fade-in-up">
            Optimize your Ads with <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
              AI-Powered Insights
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto animate-fade-in-up delay-100">
            Monitor performance, track conversions, and render your Facebook ad campaigns seamlessly through our unified dashboard.
          </p>

          <div className="flex justify-center gap-4 animate-fade-in-up delay-200">
            <Link
              href="/auth/signup"
              className="px-8 py-4 rounded-full bg-white text-black font-bold text-lg hover:scale-105 transition-transform shadow-xl shadow-white/10"
            >
              Start Tracking Now
            </Link>
            <button className="px-8 py-4 rounded-full bg-white/5 hover:bg-white/10 text-white font-semibold transition-all border border-white/10 backdrop-blur-sm">
              View Live Demo
            </button>
          </div>
        </div>
      </div>

      {/* Preview Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Live Ad Campaigns</h2>
          <p className="text-gray-400">See what others are tracking right now</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 opacity-50 hover:opacity-100 transition-opacity duration-700">
          {MOCK_ADS.slice(0, 3).map((ad) => (
            <div key={ad.id} className="pointer-events-none">
              <AdCard ad={ad} />
            </div>
          ))}
        </div>
        <div className="text-center mt-8 text-sm text-gray-500">
          * Sign in to view full analytics and manage campaigns
        </div>
      </div>
    </div>
  )
}
