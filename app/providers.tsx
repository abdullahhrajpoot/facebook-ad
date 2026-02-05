'use client'

import { ReactNode } from 'react'
import { IframeSessionProvider } from '@/contexts/IframeSessionContext'

/**
 * Client-side providers wrapper
 * Includes session context for iframe auth support
 */
export function Providers({ children }: { children: ReactNode }) {
    return (
        <IframeSessionProvider>
            {children}
        </IframeSessionProvider>
    )
}
