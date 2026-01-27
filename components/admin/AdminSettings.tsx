'use client'

import { useState, useEffect } from 'react'
import { Settings, ToggleLeft, ToggleRight, Globe, RefreshCw, CheckCircle, AlertCircle, Compass } from 'lucide-react'

interface FeatureFlag {
    id: string
    name: string
    description: string
    enabled: boolean
    icon: any
}

export default function AdminSettings() {
    const [features, setFeatures] = useState<FeatureFlag[]>([
        {
            id: 'page_discovery',
            name: 'Page Discovery',
            description: 'Allow users to discover Facebook business pages by industry keywords and location. Uses Apify actor for data fetching.',
            enabled: false,
            icon: Compass
        }
    ])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<string | null>(null)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchFeatureFlags()
    }, [])

    const fetchFeatureFlags = async () => {
        try {
            const res = await fetch('/api/settings/features')
            if (res.ok) {
                const data = await res.json()
                setFeatures(prev => prev.map(f => ({
                    ...f,
                    enabled: data[f.id] ?? f.enabled
                })))
            }
        } catch (error) {
            console.error('Failed to fetch feature flags:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleFeature = async (featureId: string) => {
        const feature = features.find(f => f.id === featureId)
        if (!feature) return

        setSaving(featureId)
        setMessage(null)

        try {
            const res = await fetch('/api/settings/features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    featureId,
                    enabled: !feature.enabled
                })
            })

            if (res.ok) {
                // Refetch to get the latest state from database
                await fetchFeatureFlags()
                setMessage({
                    type: 'success',
                    text: `${feature.name} has been ${!feature.enabled ? 'enabled' : 'disabled'}`
                })
            } else {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update')
            }
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: error.message || 'Failed to update feature'
            })
        } finally {
            setSaving(null)
            setTimeout(() => setMessage(null), 3000)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 px-2 sm:px-0">
            {/* Header */}
            <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-xl sm:rounded-2xl border border-white/10 shadow-xl">
                    <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-400" />
                </div>
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white">System Settings</h2>
                    <p className="text-zinc-500 text-xs sm:text-sm">Manage platform features and configurations</p>
                </div>
            </div>

            {/* Message Toast */}
            {message && (
                <div className={`
                    flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border animate-fade-in-up text-sm
                    ${message.type === 'success'
                        ? 'bg-green-500/10 border-green-500/20 text-green-400'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }
                `}>
                    {message.type === 'success'
                        ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                        : <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    }
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Feature Flags Section */}
            <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl sm:rounded-2xl overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-white/5">
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-500" />
                        Feature Flags
                    </h3>
                    <p className="text-zinc-500 text-xs sm:text-sm mt-1">
                        Enable or disable platform features. Changes take effect immediately.
                    </p>
                </div>

                <div className="divide-y divide-white/5">
                    {loading ? (
                        <div className="p-6 flex items-center justify-center">
                            <RefreshCw className="w-5 h-5 text-zinc-500 animate-spin" />
                        </div>
                    ) : (
                        features.map(feature => {
                            const Icon = feature.icon
                            const isLoading = saving === feature.id

                            return (
                                <div
                                    key={feature.id}
                                    className="p-4 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4 sm:gap-6 hover:bg-white/[0.02] transition-colors"
                                >
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className={`
                                            p-2.5 sm:p-3 rounded-lg sm:rounded-xl transition-colors shrink-0
                                            ${feature.enabled
                                                ? 'bg-purple-500/10 text-purple-400'
                                                : 'bg-zinc-900 text-zinc-600'
                                            }
                                        `}>
                                            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white flex flex-wrap items-center gap-2 text-sm sm:text-base">
                                                {feature.name}
                                                <span className={`
                                                    text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full uppercase tracking-wider
                                                    ${feature.enabled
                                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                        : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                                                    }
                                                `}>
                                                    {feature.enabled ? 'Active' : 'Disabled'}
                                                </span>
                                            </h4>
                                            <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-md">
                                                {feature.description}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleFeature(feature.id)}
                                        disabled={isLoading}
                                        className={`
                                            relative shrink-0 w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all duration-300
                                            ${feature.enabled
                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                                                : 'bg-zinc-800'
                                            }
                                            ${isLoading ? 'opacity-50 cursor-wait' : 'hover:ring-2 hover:ring-white/10'}
                                        `}
                                    >
                                        <div className={`
                                            absolute top-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white shadow-lg transition-all duration-300
                                            ${feature.enabled ? 'left-6 sm:left-7' : 'left-1'}
                                            ${isLoading ? 'animate-pulse' : ''}
                                        `} />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-6">
                <h4 className="font-bold text-amber-400 flex items-center gap-2 mb-2 text-sm sm:text-base">
                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Important Note
                </h4>
                <p className="text-zinc-400 text-xs sm:text-sm">
                    Feature flags control access to platform functionality. When a feature is disabled:
                </p>
                <ul className="text-zinc-500 text-xs sm:text-sm mt-2 space-y-1 ml-4 list-disc">
                    <li>The associated API routes will return a 503 (Service Unavailable) response</li>
                    <li>UI elements for that feature will be hidden from navigation</li>
                    <li>Existing data related to the feature remains intact</li>
                </ul>
            </div>
        </div>
    )
}
