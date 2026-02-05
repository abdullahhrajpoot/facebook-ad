'use client'

/**
 * API client for making authenticated requests from iframe context.
 * Uses Authorization Bearer token headers instead of cookies.
 */

type FetchOptions = Omit<RequestInit, 'headers'> & {
    headers?: Record<string, string>
}

/**
 * Create an authenticated fetch function that uses the provided access token
 */
export function createAuthFetch(accessToken: string | null) {
    return async (url: string, options: FetchOptions = {}) => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...options.headers,
        }

        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
        }

        const response = await fetch(url, {
            ...options,
            headers,
        })

        return response
    }
}

/**
 * Make an authenticated API request using access token in header
 */
export async function authFetch(
    url: string,
    accessToken: string | null,
    options: FetchOptions = {}
) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...options.headers,
    }

    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
    }

    return fetch(url, {
        ...options,
        headers,
    })
}

/**
 * API helper with common methods
 */
export function createApiClient(accessToken: string | null) {
    const baseHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        }
        if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`
        }
        return headers
    }

    return {
        get: async <T>(url: string): Promise<T> => {
            const res = await fetch(url, { headers: baseHeaders() })
            if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
            return res.json()
        },

        post: async <T>(url: string, body: unknown): Promise<T> => {
            const res = await fetch(url, {
                method: 'POST',
                headers: baseHeaders(),
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error(`POST ${url} failed: ${res.status}`)
            return res.json()
        },

        put: async <T>(url: string, body: unknown): Promise<T> => {
            const res = await fetch(url, {
                method: 'PUT',
                headers: baseHeaders(),
                body: JSON.stringify(body),
            })
            if (!res.ok) throw new Error(`PUT ${url} failed: ${res.status}`)
            return res.json()
        },

        delete: async <T>(url: string): Promise<T> => {
            const res = await fetch(url, {
                method: 'DELETE',
                headers: baseHeaders(),
            })
            if (!res.ok) throw new Error(`DELETE ${url} failed: ${res.status}`)
            return res.json()
        },
    }
}
