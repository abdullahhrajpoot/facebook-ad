'use client'

import React from 'react'

export default function SavedAds() {
    // Ideally this would fetch from a 'saved_ads' table
    // For now, we will just show a placeholder as per plan
    return (
        <div className="max-w-4xl mx-auto text-center py-20">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-12">
                <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Saved Ads</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                    Save your favorite ads to reference them later. This feature is coming soon to AdPulse!
                </p>
                <div className="inline-block px-4 py-2 bg-zinc-800 rounded-lg text-xs font-mono text-zinc-500">
                    Feature: saved_ads_v1 (In Development)
                </div>
            </div>
        </div>
    )
}
