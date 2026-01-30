'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Globe, Zap, Layers, ArrowRight, Play, Database,
  Cpu, ScanLine, BarChart2, ShieldCheck, MousePointer2
} from 'lucide-react'

// --- MARQUEE COMPONENT ---
const Marquee = ({ children, reverse = false }: { children: React.ReactNode, reverse?: boolean }) => {
  return (
    <div className="relative flex overflow-hidden w-full mask-linear-fade">
      <div className={`flex gap-8 whitespace-nowrap py-4 animate-marquee ${reverse ? 'direction-reverse' : ''}`}>
        {children}
        {children}
      </div>
      {/* Duplicate for seamless loop */}
      <div className={`absolute top-0 flex gap-8 whitespace-nowrap py-4 animate-marquee2 ${reverse ? 'direction-reverse' : ''}`}>
        {children}
        {children}
      </div>
    </div>
  )
}

// --- MAIN PAGE ---
export default function Home() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
        setProfile(profile)
      }
      setLoading(false)
    }
    checkUser()
  }, [])

  // --- MOUSE SPOTLIGHT EFFECT ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const { left, top } = containerRef.current.getBoundingClientRect()
      const x = e.clientX - left
      const y = e.clientY - top
      containerRef.current.style.setProperty('--mouse-x', `${x}px`)
      containerRef.current.style.setProperty('--mouse-y', `${y}px`)
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  if (loading) return null // Instant load feel or skeleton

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#020202] text-white relative selection:bg-indigo-500/30 font-sans overflow-x-hidden"
      style={{
        '--mouse-x': '0px',
        '--mouse-y': '0px',
        '--spotlight-size': '800px'
      } as React.CSSProperties}
    >

      {/* --- GLOBAL SPOTLIGHT --- */}
      <div className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(var(--spotlight-size) circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.03), transparent 40%)`
        }}
      />

      {/* --- GRID BACKGROUND --- */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-transparent via-[#020202]/80 to-[#020202]"></div>

      {/* --- NAVBAR --- */}
      <nav className="fixed w-full top-0 z-50 border-b border-white/5 bg-[#020202]/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm sm:text-lg font-black italic tracking-tighter text-white drop-shadow-md">IKONIC</span>
              <span className="text-sm sm:text-lg font-black italic tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent filter drop-shadow-sm">MARKETERS</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            {!user ? (
              <Link href="/auth/login" className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-white text-black text-[10px] sm:text-xs font-bold uppercase tracking-wide hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10">
                Get Started
              </Link>
            ) : (
              <>
                <span className="hidden sm:block text-xs font-bold uppercase tracking-widest text-emerald-400">
                  ✓ Logged In
                </span>
                <Link 
                  href={profile?.role === 'admin' ? '/admin/dashboard' : '/user/dashboard'} 
                  className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full bg-indigo-600 text-white text-[10px] sm:text-xs font-bold uppercase tracking-wide hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30"
                >
                  {profile?.role === 'admin' ? 'Admin Panel' : 'Search Ads'}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <div className="relative pt-32 pb-20 md:pt-48 md:pb-32 z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center">

          {/* Beam Animation Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] opacity-30 select-none pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 blur-[100px] rounded-full mix-blend-screen animate-pulse-slow"></div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-8 ring-1 ring-white/5 shadow-2xl animate-fade-in-up">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Search Facebook Ad Library</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-9xl font-black tracking-tighter mb-6 sm:mb-8 leading-[0.85] text-white drop-shadow-2xl animate-fade-in-up delay-100 mix-blend-lighten">
            UNSEEN <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-400 to-zinc-800">ADVANTAGE</span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 max-w-xl mx-auto mb-8 sm:mb-10 px-4 leading-relaxed animate-fade-in-up delay-200 font-medium">
            Declassify your competitors' strategy. Access a comprehensive archive of active campaigns, creatives, and copy.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up delay-300 w-full justify-center px-4">
            {!user ? (
              <>
                <Link href="/auth/login" className="group relative h-11 sm:h-12 px-6 sm:px-8 rounded-full bg-white text-black font-bold flex items-center justify-center gap-2 overflow-hidden hover:scale-105 transition-transform duration-300 text-sm sm:text-base">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10">Start Analyzing Ads</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a href="#features" className="h-11 sm:h-12 px-6 sm:px-8 rounded-full border border-white/10 bg-black/50 text-white font-bold hover:bg-white/10 transition-all backdrop-blur-md flex items-center justify-center gap-2 text-sm sm:text-base">
                  <Play className="w-4 h-4 fill-white" />
                  <span>See Features</span>
                </a>
              </>
            ) : profile?.role === 'admin' ? (
              <>
                <Link 
                  href="/admin/dashboard" 
                  className="group relative h-11 sm:h-12 px-6 sm:px-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 overflow-hidden hover:scale-105 transition-transform duration-300 text-sm sm:text-base"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-blue-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10">Manage Users</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/admin/dashboard" 
                  className="h-11 sm:h-12 px-6 sm:px-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold hover:bg-emerald-500/20 transition-all backdrop-blur-md flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>View All Ads</span>
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/user/dashboard" 
                  className="group relative h-11 sm:h-12 px-6 sm:px-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center gap-2 overflow-hidden hover:scale-105 transition-transform duration-300 text-sm sm:text-base"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-blue-600 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                  <span className="relative z-10">Start New Search</span>
                  <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/user/dashboard" 
                  className="h-11 sm:h-12 px-6 sm:px-8 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold hover:bg-emerald-500/20 transition-all backdrop-blur-md flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>View History</span>
                </Link>
              </>
            )}
          </div>

        </div>
      </div>

      {/* --- LIVE DATA STREAM (REPLACES MARQUEE) --- */}
      <div className="relative z-10 border-y border-white/5 bg-[#050505] overflow-hidden">
        <div className="absolute top-0 left-0 w-20 h-full bg-gradient-to-r from-[#020202] to-transparent z-10"></div>
        <div className="absolute top-0 right-0 w-20 h-full bg-gradient-to-l from-[#020202] to-transparent z-10"></div>
        <Marquee>
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-12 font-mono text-xs text-zinc-600">
              <span className="flex items-center gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> STREAM_{i + 1}: ACTIVE</span>
              <span>// DETECTED_ADS: ANALYZING</span>
              <span>&gt;&gt; PARSING_CREATIVES...</span>
              <span className="text-zinc-800">|</span>
              <span className="flex items-center gap-2"> <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> NODE_US_EAST: ONLINE</span>
              <span>// INDEXING_NEW_ASSETS</span>
              <span>&gt;&gt; SYNC_COMPLETE</span>
            </div>
          ))}
        </Marquee>
      </div>

      {/* --- INTELLIGENCE MODULES --- */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-32 space-y-16 sm:space-y-24 md:space-y-32">

        {/* Module 01: Deep Search */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center group">
          <div className="order-2 md:order-1 relative">
            {/* Decorative Lines */}
            <div className="absolute -left-8 -top-8 w-16 h-16 border-l border-t border-zinc-800"></div>
            <div className="absolute -right-8 -bottom-8 w-16 h-16 border-r border-b border-zinc-800"></div>

            <div className="relative z-10 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="h-8 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
                <div className="flex-1 text-center text-[10px] font-mono text-zinc-600">SEARCH_PROTOCOL.EXE</div>
              </div>
              <div className="p-8 space-y-4">
                <div className="flex items-center gap-3 text-zinc-400 font-mono text-sm border-b border-white/10 pb-4">
                  <span className="text-emerald-500">$</span>
                  <span className="typing-effect">find --keywords "dropshipping" --country "US"</span>
                  <span className="w-2 h-4 bg-emerald-500 animate-pulse"></span>
                </div>
                {/* Fake Results */}
                <div className="space-y-3 pt-2">
                  {[1, 2, 3].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-white/5 border border-white/5 opacity-0 animate-fade-in-up" style={{ animationDelay: `${i * 200}ms`, animationFillMode: 'forwards' }}>
                      <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center">
                        <div className="w-5 h-5 bg-zinc-600/50 rounded-sm"></div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="h-2 w-24 bg-zinc-700 rounded-full"></div>
                        <div className="h-2 w-16 bg-zinc-800 rounded-full"></div>
                      </div>
                      <div className="text-[10px] font-mono text-emerald-500">MATCH_FOUND</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 text-indigo-400 font-mono text-xs">
              <ScanLine className="w-4 h-4" /> MODULE_01
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white">
              SURGICAL <br /><span className="text-zinc-600">PRECISION.</span>
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed max-w-sm">
              Don't just browse. Target. Filter ads by keyword, domain, or landing page URL. If it's running, we have it archived.
            </p>
          </div>
        </div>

        {/* Module 02: Visual Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 text-purple-400 font-mono text-xs">
              <Cpu className="w-4 h-4" /> MODULE_02
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white">
              VISUAL <br /><span className="text-zinc-600">FORENSICS.</span>
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed max-w-sm">
              Our engine parses video and image creatives to extract text, detect formats, and identify high-performing hook patterns.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/10 blur-[80px] rounded-full"></div>
            <div className="relative z-10 bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-1">
              <div className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden">
                {/* Simulated Scanning Interface */}
                <div className="absolute inset-0 z-20 border-[2px] border-purple-500/30 m-4 rounded-lg">
                  <div className="absolute top-0 left-0 w-2 h-2 border-l-2 border-t-2 border-purple-500 -translate-x-[1px] -translate-y-[1px]"></div>
                  <div className="absolute top-0 right-0 w-2 h-2 border-r-2 border-t-2 border-purple-500 translate-x-[1px] -translate-y-[1px]"></div>
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-l-2 border-b-2 border-purple-500 -translate-x-[1px] translate-y-[1px]"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-r-2 border-b-2 border-purple-500 translate-x-[1px] translate-y-[1px]"></div>
                </div>
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-scan-vertical z-30"></div>

                {/* Abstract Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="w-12 h-12 text-zinc-700" />
                </div>

                {/* Detected Labels */}
                <div className="absolute top-8 right-8 flex flex-col gap-2 z-20">
                  <span className="px-2 py-1 bg-black/60 backdrop-blur border border-purple-500/30 text-[10px] font-mono text-purple-300 rounded">Format: VIDEO_9:16</span>
                  <span className="px-2 py-1 bg-black/60 backdrop-blur border border-purple-500/30 text-[10px] font-mono text-purple-300 rounded">Duration: 42s</span>
                  <span className="px-2 py-1 bg-black/60 backdrop-blur border border-purple-500/30 text-[10px] font-mono text-purple-300 rounded">CTR_Est: HIGH</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Module 03: Global Intel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div className="order-2 md:order-1 relative">
            <div className="absolute inset-0 bg-blue-500/10 blur-[100px] rounded-full"></div>
            <div className="relative z-10 p-8 rounded-full border border-white/5 bg-[#0A0A0A] aspect-square flex items-center justify-center">
              {/* Radar Rings */}
              <div className="absolute inset-0 border border-white/5 rounded-full scale-[0.8]"></div>
              <div className="absolute inset-0 border border-white/5 rounded-full scale-[0.6]"></div>
              <div className="absolute inset-0 border border-white/5 rounded-full scale-[0.4]"></div>

              {/* Radar Sweep */}
              <div className="absolute top-1/2 left-1/2 w-[50%] h-[2px] bg-gradient-to-r from-transparent to-blue-500 origin-left animate-radar-spin opacity-50"></div>

              {/* Blips */}
              <div className="absolute top-[30%] left-[40%] w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
              <div className="absolute bottom-[40%] right-[30%] w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              <div className="absolute top-[20%] right-[20%] w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>

              <Globe className="w-32 h-32 text-zinc-800" strokeWidth={0.5} />
            </div>
          </div>
          <div className="order-1 md:order-2 space-y-6">
            <div className="inline-flex items-center gap-2 text-blue-400 font-mono text-xs">
              <Globe className="w-4 h-4" /> MODULE_03
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white">
              GLOBAL <br /><span className="text-zinc-600">SURVEILLANCE.</span>
            </h2>
            <p className="text-lg text-zinc-400 leading-relaxed max-w-sm">
              Global ad coverage. Identify cross-border scaling opportunities before the masses catch on.
            </p>
          </div>
        </div>

      </section>



      {/* --- FOOTER --- */}
      {/* --- FOOTER (SILVER REVEAL) --- */}
      <footer className="relative py-12 sm:py-16 md:py-24 bg-[#050505] border-t border-white/10 overflow-hidden">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 flex flex-col items-center">

          {/* Reveal Container */}
          <div className="relative overflow-hidden">
            <h1 className="text-[10vw] sm:text-[12vw] leading-none font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-200 to-zinc-600 animate-footer-reveal select-none text-center">
              IKONIC MARKETERS
            </h1>
          </div>

          <div className="mt-8 sm:mt-12 flex flex-col md:flex-row items-center justify-between w-full max-w-7xl border-t border-white/5 pt-6 sm:pt-8 gap-4">
            <p className="text-zinc-600 font-mono text-[10px] sm:text-xs text-center md:text-left">
              © 2024 IKONIC MARKETERS INC. ALL RIGHTS RESERVED.
            </p>
            <div className="flex gap-4 sm:gap-8 text-zinc-600 font-mono text-[10px] sm:text-xs uppercase tracking-widest">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx global>{`
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-100%); }
                }
                @keyframes marquee2 {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(0); }
                }
                .animate-marquee {
                    animation: marquee 60s linear infinite;
                }
                .animate-marquee2 {
                    animation: marquee2 60s linear infinite;
                }
                .mask-linear-fade {
                    mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
                }
                .stroke-text {
                    -webkit-text-stroke: 1px rgba(255,255,255,0.1);
                }
                @keyframes scan-vertical {
                    0% { top: -10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 110%; opacity: 0; }
                }
                .animate-scan-vertical {
                    animation: scan-vertical 3s linear infinite;
                }
                @keyframes footer-reveal {
                    0% { transform: translateY(100%); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .animate-footer-reveal {
                    animation: footer-reveal 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

    </div >
  )
}
