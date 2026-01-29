# Integration Guide: CSRF Protection in Admin Components

## For AdminUserProfile Component

### Current Implementation Issues
The admin user profile component sends requests to `/api/admin/users` but does **NOT** include CSRF tokens.

### Required Changes

Add this near the top of `components/admin/AdminUserProfile.tsx`:

```typescript
import { useEffect, useState } from 'react'

// ... existing imports ...

export default function AdminUserProfile({ user, onBack, onSave }: AdminUserProfileProps) {
    const [csrfToken, setCsrfToken] = useState<string>('')
    const [loadingCSRF, setLoadingCSRF] = useState(true)
    
    // ... existing state ...

    // Fetch CSRF token on mount
    useEffect(() => {
        const getCSRFToken = async () => {
            try {
                const response = await fetch('/api/csrf-token')
                const data = await response.json()
                setCsrfToken(data.token)
            } catch (error) {
                console.error('Failed to get CSRF token:', error)
            } finally {
                setLoadingCSRF(false)
            }
        }
        
        getCSRFToken()
    }, [])

    // ... existing code ...

    // Find the save/submit handler and update it:
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (!csrfToken) {
            setError('Security token not available. Please refresh.')
            return
        }

        try {
            const endpoint = user ? '/api/admin/users' : '/api/admin/users'
            const method = user ? 'PUT' : 'POST'

            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken  // ADD THIS LINE
                },
                body: JSON.stringify({
                    id: user?.id,
                    email: formData.email,
                    password: formData.password,
                    full_name: formData.full_name,
                    gender: formData.gender,
                    role: formData.role
                })
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || 'Failed to save user')
                return
            }

            onSave?.()
        } catch (error: any) {
            setError(error.message)
        }
    }

    if (loadingCSRF) {
        return <div>Loading security tokens...</div>
    }

    // ... rest of component ...
}
```

---

## For UsersList Component (Delete Operations)

Add CSRF token fetching similar to above:

```typescript
const handleDeleteUser = async (userId: string) => {
    if (!csrfToken) {
        setError('Security token not available. Please refresh.')
        return
    }

    try {
        const response = await fetch(`/api/admin/users?id=${userId}`, {
            method: 'DELETE',
            headers: {
                'x-csrf-token': csrfToken  // ADD THIS LINE
            }
        })

        if (!response.ok) {
            const data = await response.json()
            setError(data.error || 'Failed to delete user')
            return
        }

        // Refresh user list
        await fetchUsers()
    } catch (error: any) {
        setError(error.message)
    }
}
```

---

## For AdminSettings Component (Feature Flags)

If updating feature flags via API:

```typescript
const handleToggleFeature = async (featureId: string, enabled: boolean) => {
    if (!csrfToken) {
        setError('Security token not available.')
        return
    }

    try {
        const response = await fetch('/api/settings/features', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken  // ADD THIS LINE
            },
            body: JSON.stringify({ featureId, enabled })
        })

        if (!response.ok) {
            throw new Error('Failed to update feature flag')
        }

        // Success handling...
    } catch (error) {
        setError(error.message)
    }
}
```

---

## Custom Hook for CSRF Token Management

Create `hooks/useCSRFToken.ts`:

```typescript
import { useEffect, useState } from 'react'

export function useCSRFToken() {
    const [token, setToken] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const response = await fetch('/api/csrf-token')
                if (!response.ok) {
                    throw new Error('Failed to fetch CSRF token')
                }
                const data = await response.json()
                setToken(data.token)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }

        fetchToken()
    }, [])

    return { token, loading, error }
}
```

Then use in components:

```typescript
import { useCSRFToken } from '@/hooks/useCSRFToken'

export default function AdminUserProfile() {
    const { token: csrfToken, loading: loadingCSRF } = useCSRFToken()
    
    // ... rest of component ...
}
```

---

## Important Notes

### When to Refresh Token
- Tokens expire after 24 hours (configurable in `utils/csrf.ts`)
- For long-running admin sessions, refresh every 12 hours:

```typescript
const CSRF_REFRESH_INTERVAL = 12 * 60 * 60 * 1000 // 12 hours

useEffect(() => {
    const interval = setInterval(() => {
        fetch('/api/csrf-token').then(r => r.json()).then(d => setToken(d.token))
    }, CSRF_REFRESH_INTERVAL)
    
    return () => clearInterval(interval)
}, [])
```

### Error Handling
When CSRF validation fails (403 Forbidden):

```typescript
if (response.status === 403) {
    // Token may have expired, refresh it
    const newToken = await fetch('/api/csrf-token').then(r => r.json())
    setCsrfToken(newToken.token)
    // Retry the request
}
```

### Password Requirements Display
When creating users, show password requirements:

```typescript
<div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
    <p className="font-semibold mb-2">Password must contain:</p>
    <ul className="list-disc list-inside space-y-1">
        <li>At least 8 characters</li>
        <li>At least one uppercase letter (A-Z)</li>
        <li>At least one lowercase letter (a-z)</li>
        <li>At least one number (0-9)</li>
        <li>At least one special character (!@#$%^&*)</li>
    </ul>
    <p className="mt-2 text-xs">Example: <code className="bg-white px-2 py-1">MySecure#Pass1</code></p>
</div>
```

---

## Testing CSRF in Components

```typescript
// In your test file
it('should include CSRF token in admin requests', async () => {
    const { getByText } = render(<AdminUserProfile user={null} onBack={jest.fn()} onSave={jest.fn()} />)
    
    // Fetch should be called to get token
    expect(global.fetch).toHaveBeenCalledWith('/api/csrf-token')
    
    // Fill form and submit
    // ...
    
    // Next fetch (save request) should include CSRF header
    expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
            headers: expect.objectContaining({
                'x-csrf-token': expect.any(String)
            })
        })
    )
})
```

---

**Summary:** All admin components making POST/PUT/DELETE requests **MUST** include the `x-csrf-token` header. Use the custom hook `useCSRFToken()` for cleaner code.
