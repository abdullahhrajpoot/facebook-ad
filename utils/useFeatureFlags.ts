'use client'

import { useState, useEffect } from 'react'

interface FeatureFlags {
    page_discovery: boolean
    [key: string]: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
    page_discovery: false
}

export function useFeatureFlags() {
    const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchFlags()
    }, [])

    const fetchFlags = async () => {
        try {
            const res = await fetch('/api/settings/features')
            if (res.ok) {
                const data = await res.json()
                setFlags({ ...DEFAULT_FLAGS, ...data })
            }
        } catch (error) {
            console.error('Failed to fetch feature flags:', error)
        } finally {
            setLoading(false)
        }
    }

    const isEnabled = (featureId: string): boolean => {
        return flags[featureId] ?? false
    }

    return {
        flags,
        loading,
        isEnabled,
        refetch: fetchFlags
    }
}

export default useFeatureFlags
