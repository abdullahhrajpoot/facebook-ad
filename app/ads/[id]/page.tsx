'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { MOCK_ADS } from '../../../utils/mockData'
import { createClient } from '../../../utils/supabase/client'
import Link from 'next/link'

export default function AdDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const [ad, setAd] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        // 1. Check auth (basic protection)
        // In a real app we might fetch the specific ad from API
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/auth/login')
                return
            }
            // 2. Find Ad
            const foundAd = MOCK_ADS.find(a => a.id === params.id)
            setAd(foundAd)
            setLoading(false)
        }
        checkAuth()
    }, [params.id, router])

    if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading Ad...</div>

    if (!ad) return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center">
            <h1 className="text-2xl font-bold mb-4">Ad Not Found</h1>
            <Link href="/" className="text-blue-400 hover:underline">Return Home</Link>
        </div>
    )

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Nav */}
            <nav className="border-b border-zinc-800 bg-zinc-950 px-8 py-4 flex items-center gap-4">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">
                    ← Back
                </button>
                <div className="h-6 w-px bg-zinc-800"></div>
                <span className="font-semibold">{ad.title}</span>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium border ${ad.status === 'Active' ? 'text-green-400 bg-green-900/30 border-green-500/30' : 'text-gray-400 bg-gray-800 border-gray-700'}`}>
                    {ad.status}
                </span>
            </nav>

            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Left: Visuals */}
                    <div>
                        <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl mb-8">
                            <img src={ad.imageUrl} alt={ad.title} className="w-full object-cover" />
                        </div>

                        <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
                            <h3 className="font-semibold mb-4 text-gray-400 uppercase text-xs tracking-wider">Preview</h3>
                            <div className="border border-zinc-700 bg-zinc-800 rounded-lg p-4 max-w-sm mx-auto">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-600"></div>
                                    <div>
                                        <div className="h-2 w-24 bg-zinc-600 rounded mb-1"></div>
                                        <div className="h-2 w-16 bg-zinc-700 rounded"></div>
                                    </div>
                                </div>
                                <div className="h-32 bg-zinc-700 rounded mb-3"></div>
                                <div className="h-2 w-full bg-zinc-600 rounded mb-2"></div>
                                <div className="h-2 w-2/3 bg-zinc-600 rounded mb-4"></div>
                                <div className="h-8 bg-blue-600 rounded w-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Right: Stats & Info */}
                    <div>
                        <h1 className="text-4xl font-bold mb-4">{ad.title}</h1>
                        <p className="text-xl text-gray-400 mb-8">{ad.description}</p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="text-gray-500 text-sm mb-1">Total Impressions</div>
                                <div className="text-3xl font-bold text-white">{ad.impressions}</div>
                            </div>
                            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="text-gray-500 text-sm mb-1">Clicks</div>
                                <div className="text-3xl font-bold text-blue-400">{ad.clicks}</div>
                            </div>
                            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="text-gray-500 text-sm mb-1">Ad Spend</div>
                                <div className="text-3xl font-bold text-green-400">{ad.spend}</div>
                            </div>
                            <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-800">
                                <div className="text-gray-500 text-sm mb-1">CTR</div>
                                <div className="text-3xl font-bold text-purple-400">2.4%</div>
                                {/* ^ Hardcoded calculation for demo */}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Targeting</h3>
                            <div className="flex flex-wrap gap-2">
                                {['United States', 'Age 18-35', 'Tech Interest', 'Mobile Users'].map(tag => (
                                    <span key={tag} className="px-3 py-1 bg-zinc-800 rounded-full text-sm border border-zinc-700">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
