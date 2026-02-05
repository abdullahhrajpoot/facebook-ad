'use client'

import { useState, useEffect, useCallback } from 'react'
import { isInIframe } from './iframeAuth'

interface StorageAccessState {
    hasAccess: boolean
    isChecking: boolean
    error: string | null
    browserSupported: boolean
}

/**
 * Check if the browser supports the Storage Access API
 */
export function isStorageAccessSupported(): boolean {
    if (typeof document === 'undefined') return false
    return 'hasStorageAccess' in document && 'requestStorageAccess' in document
}

/**
 * Check if we currently have storage access
 */
export async function checkStorageAccess(): Promise<boolean> {
    if (!isStorageAccessSupported()) return true // Assume access if API not supported

    try {
        return await document.hasStorageAccess()
    } catch {
        return false
    }
}

/**
 * Request storage access (requires user gesture)
 */
export async function requestStorageAccess(): Promise<boolean> {
    if (!isStorageAccessSupported()) return true

    try {
        await document.requestStorageAccess()
        return true
    } catch (error) {
        console.error('[StorageAccess] Request denied:', error)
        return false
    }
}

/**
 * Hook to manage storage access in iframes
 */
export function useStorageAccess() {
    const [state, setState] = useState<StorageAccessState>({
        hasAccess: false,
        isChecking: true,
        error: null,
        browserSupported: false,
    })

    useEffect(() => {
        const check = async () => {
            // Not in iframe - always have access
            if (!isInIframe()) {
                setState({
                    hasAccess: true,
                    isChecking: false,
                    error: null,
                    browserSupported: true,
                })
                return
            }

            const supported = isStorageAccessSupported()

            if (!supported) {
                // API not supported - we may or may not have access
                setState({
                    hasAccess: true, // Optimistically assume access
                    isChecking: false,
                    error: null,
                    browserSupported: false,
                })
                return
            }

            try {
                const hasAccess = await checkStorageAccess()
                setState({
                    hasAccess,
                    isChecking: false,
                    error: null,
                    browserSupported: true,
                })
            } catch (error: any) {
                setState({
                    hasAccess: false,
                    isChecking: false,
                    error: error.message,
                    browserSupported: true,
                })
            }
        }

        check()
    }, [])

    const requestAccess = useCallback(async () => {
        if (!state.browserSupported) return true

        setState(prev => ({ ...prev, isChecking: true }))

        const granted = await requestStorageAccess()

        setState({
            hasAccess: granted,
            isChecking: false,
            error: granted ? null : 'Storage access request was denied',
            browserSupported: true,
        })

        return granted
    }, [state.browserSupported])

    return {
        ...state,
        requestAccess,
    }
}

/**
 * Component that prompts user to grant storage access in iframe
 */
export function StorageAccessPrompt({
    onAccessGranted,
    onSkip,
}: {
    onAccessGranted: () => void
    onSkip?: () => void
}) {
    const { hasAccess, isChecking, requestAccess, browserSupported } = useStorageAccess()
    const [requesting, setRequesting] = useState(false)

    useEffect(() => {
        if (hasAccess && !isChecking) {
            onAccessGranted()
        }
    }, [hasAccess, isChecking, onAccessGranted])

    if (isChecking) {
        return (
            <div className= "flex items-center justify-center p-8" >
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
        )
    }

    if (hasAccess) {
        return null
    }

    const handleRequestAccess = async () => {
        setRequesting(true)
        const granted = await requestAccess()
        setRequesting(false)

        if (granted) {
            // Reload to re-initialize with storage access
            window.location.reload()
        }
    }

    return (
        <div className= "fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" >
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4" >
            <div className="text-center space-y-2" >
                <div className="w-16 h-16 mx-auto bg-blue-500/10 rounded-full flex items-center justify-center" >
                    <svg className="w-8 h-8 text-blue-500" fill = "none" viewBox = "0 0 24 24" stroke = "currentColor" >
                        <path strokeLinecap="round" strokeLinejoin = "round" strokeWidth = { 2} d = "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            </div>
                            < h2 className = "text-xl font-bold text-white" > Enable Login Access </h2>
                                < p className = "text-zinc-400 text-sm" >
                                {
                                    browserSupported
                                    ? "This app is embedded and needs your permission to save your login session."
                                        : "Your browser may block login sessions in embedded apps. Try opening in a new window."
                                }
                                    </p>
                                    </div>

                                    < div className = "space-y-3" >
                                        { browserSupported && (
                                            <button
                            onClick={ handleRequestAccess }
    disabled = { requesting }
    className = "w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
        >
        { requesting? 'Requesting...': 'Allow Access' }
        </button>
                    )
}

<button
                        onClick={ () => window.open(window.location.href, '_blank') }
className = "w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
    >
    Open in New Window
        </button>

{
    onSkip && (
        <button
                            onClick={ onSkip }
    className = "w-full py-2 text-zinc-500 text-sm hover:text-zinc-400 transition-colors"
        >
        Continue anyway(login may not persist)
            </button>
                    )
}
</div>
    </div>
    </div>
    )
}
