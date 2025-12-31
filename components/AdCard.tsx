'use client'

import Link from 'next/link'

interface AdCardProps {
    ad: {
        id: string
        title: string
        description: string
        imageUrl: string
        status: string
        impressions: string
        clicks: string
        spend: string
    }
}

export default function AdCard({ ad }: AdCardProps) {
    const statusColor = {
        'Active': 'text-green-400 bg-green-400/10 border-green-400/20',
        'Reviewing': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        'Paused': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
        'Ended': 'text-gray-400 bg-gray-400/10 border-gray-400/20',
    }[ad.status] || 'text-gray-400'

    return (
        <Link href={`/ads/${ad.id}`} className="block group">
            <div className="bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 transition-all hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1 h-full flex flex-col">
                <div className="aspect-video relative overflow-hidden bg-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={ad.imageUrl}
                        alt={ad.title}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-md ${statusColor}`}>
                            {ad.status}
                        </span>
                    </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {ad.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 flex-1">
                        {ad.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            {ad.impressions}
                        </div>
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                            {ad.clicks}
                        </div>
                        <div className="font-medium text-gray-300">
                            {ad.spend}
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    )
}
