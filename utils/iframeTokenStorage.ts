'use client'

/**
 * Iframe Token Storage
 * 
 * Persists tokens in a way that survives page navigation in iframe context.
 * Storage fallback chain: sessionStorage → IndexedDB → memory
 * IndexedDB works in Safari/Firefox iframes when sessionStorage is blocked.
 */

const STORAGE_KEY = 'iframe_auth_tokens'
const DB_NAME = 'iframe_auth_db'
const DB_STORE = 'tokens'
const DB_VERSION = 1

// In-memory fallback when all storage fails
let _memoryTokens: StoredTokens | null = null

interface StoredTokens {
    accessToken: string
    refreshToken: string
    userId: string
    email: string
    role: string
    expiresAt: number
}

export type { StoredTokens }

/**
 * Open IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
            reject(new Error('IndexedDB not supported'))
            return
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE)
            }
        }
    })
}

/**
 * Save tokens to IndexedDB
 */
async function saveTokensToIndexedDB(data: StoredTokens): Promise<boolean> {
    try {
        const db = await openDatabase()
        return new Promise((resolve) => {
            const transaction = db.transaction(DB_STORE, 'readwrite')
            const store = transaction.objectStore(DB_STORE)
            const request = store.put(data, STORAGE_KEY)

            request.onsuccess = () => {
                console.log('[TokenStorage] Saved to IndexedDB')
                resolve(true)
            }
            request.onerror = () => {
                console.log('[TokenStorage] IndexedDB save failed:', request.error)
                resolve(false)
            }

            transaction.oncomplete = () => db.close()
        })
    } catch (err) {
        console.log('[TokenStorage] IndexedDB not available:', err)
        return false
    }
}

/**
 * Get tokens from IndexedDB
 */
async function getTokensFromIndexedDB(): Promise<StoredTokens | null> {
    try {
        const db = await openDatabase()
        return new Promise((resolve) => {
            const transaction = db.transaction(DB_STORE, 'readonly')
            const store = transaction.objectStore(DB_STORE)
            const request = store.get(STORAGE_KEY)

            request.onsuccess = () => {
                const data = request.result as StoredTokens | undefined
                if (data && data.expiresAt > Date.now()) {
                    console.log('[TokenStorage] Retrieved from IndexedDB')
                    resolve(data)
                } else {
                    resolve(null)
                }
            }
            request.onerror = () => resolve(null)

            transaction.oncomplete = () => db.close()
        })
    } catch {
        return null
    }
}

/**
 * Clear tokens from IndexedDB
 */
async function clearTokensFromIndexedDB(): Promise<void> {
    try {
        const db = await openDatabase()
        const transaction = db.transaction(DB_STORE, 'readwrite')
        const store = transaction.objectStore(DB_STORE)
        store.delete(STORAGE_KEY)
        transaction.oncomplete = () => db.close()
    } catch {
        // Ignore errors
    }
}

/**
 * Save tokens - tries sessionStorage → IndexedDB → memory
 */
export async function saveTokens(tokens: Omit<StoredTokens, 'expiresAt'>): Promise<boolean> {
    const data: StoredTokens = {
        ...tokens,
        // Tokens expire after 1 hour (will need refresh)
        expiresAt: Date.now() + 60 * 60 * 1000,
    }

    // Always save to memory as fallback
    _memoryTokens = data

    // Try sessionStorage first
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        console.log('[TokenStorage] Saved to sessionStorage')
        return true
    } catch (err) {
        console.log('[TokenStorage] sessionStorage failed:', err)
    }

    // Try IndexedDB (works in Safari iframes when sessionStorage blocked)
    const indexedDBSuccess = await saveTokensToIndexedDB(data)
    if (indexedDBSuccess) {
        return true
    }

    // Memory fallback is set above - session will work until page refresh
    console.log('[TokenStorage] Using memory-only storage (will not persist on refresh)')
    return true
}

/**
 * Get tokens from storage (async to support IndexedDB)
 * Checks: sessionStorage → IndexedDB → URL hash → memory
 */
export async function getTokens(): Promise<StoredTokens | null> {
    // Try sessionStorage first (fastest)
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
            const data = JSON.parse(stored) as StoredTokens
            // Check if expired
            if (data.expiresAt > Date.now()) {
                console.log('[TokenStorage] Retrieved from sessionStorage')
                _memoryTokens = data // sync to memory
                return data
            } else {
                console.log('[TokenStorage] Token expired in sessionStorage')
                sessionStorage.removeItem(STORAGE_KEY)
            }
        }
    } catch (err) {
        console.log('[TokenStorage] sessionStorage read failed:', err)
    }

    // Try IndexedDB (works when sessionStorage is blocked)
    const indexedDBTokens = await getTokensFromIndexedDB()
    if (indexedDBTokens) {
        _memoryTokens = indexedDBTokens // sync to memory
        return indexedDBTokens
    }

    // Try URL hash (for initial navigation from popup)
    try {
        const hash = window.location.hash
        if (hash.startsWith('#auth=')) {
            const encoded = hash.substring(6)
            const decoded = atob(encoded)
            const data = JSON.parse(decoded) as StoredTokens
            console.log('[TokenStorage] Retrieved from URL hash')

            // Clear the hash for security
            window.history.replaceState(null, '', window.location.pathname + window.location.search)

            // Try to save to persistent storage
            await saveTokens(data)

            return data
        }
    } catch (err) {
        console.log('[TokenStorage] URL hash parse failed:', err)
    }

    // Try memory fallback (last resort - won't survive refresh)
    if (_memoryTokens && _memoryTokens.expiresAt > Date.now()) {
        console.log('[TokenStorage] Retrieved from memory (will not persist)')
        return _memoryTokens
    }

    return null
}

/**
 * Synchronous token check (for initial render - checks memory/sessionStorage only)
 */
export function getTokensSync(): StoredTokens | null {
    // Check memory first
    if (_memoryTokens && _memoryTokens.expiresAt > Date.now()) {
        return _memoryTokens
    }

    // Try sessionStorage
    try {
        const stored = sessionStorage.getItem(STORAGE_KEY)
        if (stored) {
            const data = JSON.parse(stored) as StoredTokens
            if (data.expiresAt > Date.now()) {
                _memoryTokens = data
                return data
            }
        }
    } catch {
        // Ignore
    }

    return null
}

/**
 * Clear tokens from all storage
 */
export async function clearTokens(): Promise<void> {
    _memoryTokens = null

    try {
        sessionStorage.removeItem(STORAGE_KEY)
    } catch { }

    await clearTokensFromIndexedDB()

    // Clear URL hash if present
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#auth=')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
}

/**
 * Build redirect URL with tokens in hash (for iframe navigation)
 */
export function buildAuthRedirectUrl(
    targetPath: string,
    tokens: Omit<StoredTokens, 'expiresAt'>
): string {
    const data: StoredTokens = {
        ...tokens,
        expiresAt: Date.now() + 60 * 60 * 1000,
    }

    const encoded = btoa(JSON.stringify(data))
    return `${targetPath}#auth=${encoded}`
}

/**
 * Check if we're in an iframe
 */
export function isInIframe(): boolean {
    if (typeof window === 'undefined') return false
    try {
        return window.self !== window.top
    } catch {
        return true
    }
}
