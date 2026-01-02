'use client'

import { AdData } from '@/utils/adValidation'

interface AdPreviewModalProps {
    ad: AdData
    isOpen: boolean
    onClose: () => void
}

export default function AdPreviewModal({ ad, isOpen, onClose }: AdPreviewModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Media Section */}
                <div className="w-full md:w-1/2 bg-black flex items-center justify-center p-4 overflow-hidden border-b md:border-b-0 md:border-r border-zinc-800">
                    <img
                        src={ad.imageUrl}
                        alt="Ad Creative"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                    />
                </div>

                {/* Details Section */}
                <div className="w-full md:w-1/2 flex flex-col p-8 overflow-y-auto">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/20">
                            {ad.pageName?.[0]}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-white">{ad.pageName}</h3>
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                                <span className={`w-2 h-2 rounded-full ${ad.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                                {ad.isActive ? 'Active' : 'Inactive'}
                                <span>•</span>
                                <span>ID: {ad.adArchiveID}</span>
                            </div>
                        </div>
                    </div>

                    {/* Ad Content */}
                    <div className="space-y-6 flex-1">
                        <div>
                            <h4 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Ad Copy</h4>
                            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                                {ad.body || 'No text content available.'}
                            </p>
                        </div>

                        {(ad.title || ad.linkDescription) && (
                            <div className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                                <h4 className="font-bold text-white mb-1">{ad.title}</h4>
                                <p className="text-zinc-400 text-xs">{ad.linkDescription}</p>
                                <div className="mt-3 text-xs text-zinc-500 uppercase font-mono">
                                    {new URL(ad.linkUrl || 'https://facebook.com').hostname}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                                <span className="block text-xs text-zinc-500 mb-1">Start Date</span>
                                <span className="text-sm font-medium text-white">
                                    {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                            <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800">
                                <span className="block text-xs text-zinc-500 mb-1">Platforms</span>
                                <div className="flex gap-2">
                                    {ad.publisherPlatform?.map(p => (
                                        <span key={p} className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300 capitalize">
                                            {p}
                                        </span>
                                    )) || <span className="text-xs text-zinc-600">-</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="mt-8 pt-6 border-t border-zinc-800">
                        <a
                            href={ad.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 group"
                        >
                            <span>{ad.ctaText || 'Learn More'}</span>
                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </a>
                        <p className="text-center mt-3 text-[10px] text-zinc-600">
                            Redirects to external landing page
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
