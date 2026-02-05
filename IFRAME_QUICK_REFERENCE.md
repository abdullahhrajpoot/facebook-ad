# Iframe Login - Quick Reference Card

## Essential Code Snippets

### Basic Iframe Embed
```html
<iframe 
  id="login-frame"
  src="https://yourdomain.com/auth/login"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
></iframe>
```

### Listen for Auth Complete
```javascript
window.addEventListener('message', (e) => {
  if (e.data.type === 'AUTH_COMPLETE' && e.data.data.success) {
    const { userId, role } = e.data.data
    console.log(`✅ ${role} ${userId} logged in`)
  }
})
```

### Using React Component
```tsx
import { IframeLogin } from '@/components/IframeLoginHelper'

export function LoginWidget() {
  return (
    <IframeLogin
      loginUrl="https://yourdomain.com/auth/login?iframe=true"
      onAuthComplete={(data) => {
        console.log('Logged in as:', data.role)
      }}
      onAuthError={(error) => console.error(error)}
      width="400px"
      height="600px"
    />
  )
}
```

### Using Vanilla JavaScript
```javascript
import { IframeLoginHelper } from '@/components/IframeLoginHelper'

// Embed iframe
IframeLoginHelper.embedIframe(
  'login-container',
  'https://yourdomain.com/auth/login'
)

// Handle success
IframeLoginHelper.onAuthComplete((data) => {
  console.log('User:', data.userId, 'Role:', data.role)
})

// Handle error
IframeLoginHelper.onAuthError((error) => {
  console.error('Login failed:', error)
})
```

## Message Format

### From Iframe to Parent (Success)
```javascript
{
  type: 'AUTH_COMPLETE',
  data: {
    success: true,
    userId: 'user-123',
    role: 'admin' // or 'user'
  }
}
```

### From Iframe to Parent (Error)
```javascript
{
  type: 'AUTH_COMPLETE',
  data: {
    success: false,
    error: 'Invalid credentials'
  }
}
```

## Sandbox Attributes

Required for iframe to work:
- `allow-same-origin` - Access cookies
- `allow-scripts` - Run JavaScript
- `allow-forms` - Submit forms
- `allow-popups` - Open pop-ups (if needed)
- `allow-top-navigation` - Navigate parent (for redirects)

## Troubleshooting Checklist

- [ ] Browser console shows no CORS errors
- [ ] Can type and submit login form
- [ ] Parent window receives `AUTH_COMPLETE` message
- [ ] Message contains `userId` and `role`
- [ ] DevTools shows cookies with `SameSite=None; Secure`
- [ ] Session persists on page refresh
- [ ] Works on HTTPS (not HTTP)

## Browser DevTools Inspection

### Check Headers
1. Open DevTools Network tab
2. Click login POST request
3. Response Headers tab should show:
   - `X-Frame-Options: ALLOWALL`
   - `Content-Security-Policy: frame-ancestors 'self' *`

### Check Cookies
1. DevTools → Application → Cookies
2. Look for `sb-` prefixed cookies (Supabase)
3. Should have `SameSite=None; Secure` flags

### Check Messages
```javascript
// In parent console
window.addEventListener('message', (e) => {
  console.log('Message:', e.data, 'From:', e.origin)
})
```

## Production Checklist

- [ ] Change CSP from `*` to specific domains
- [ ] Update postMessage origin from `*` to parent domain
- [ ] Enable HTTPS (already enforced)
- [ ] Set up security monitoring
- [ ] Test with actual parent domain
- [ ] Implement rate limiting (already done)
- [ ] Monitor authentication logs

## Iframe Attribute Reference

| Attribute | Purpose |
|-----------|---------|
| `src` | URL to load |
| `sandbox` | Security restrictions |
| `allow` | Feature permissions |
| `title` | Accessibility label |
| `loading` | Lazy load: `lazy` or `eager` |
| `referrerpolicy` | Referrer info: `no-referrer` |

## Environment Variables

No additional env vars needed - uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Debugging Commands

```javascript
// Check if in iframe
window.self !== window.top

// Send test message to parent
window.parent.postMessage({ test: true }, '*')

// Listen for messages
window.addEventListener('message', console.log)

// Check cookies
document.cookie

// Check origin
window.location.origin
```

## Common Issues

| Issue | Fix |
|-------|-----|
| "Denying access to element" | Add `allow-top-navigation` |
| Cookies not saved | Check HTTPS, check `SameSite=None` |
| postMessage not received | Check origin in parent listener |
| Login succeeds but no redirect | Try `allow-top-navigation-by-user-activation` |
| Form submission hangs | Check rate limiting (429 response) |

## File Locations

| Purpose | File |
|---------|------|
| Iframe utilities | `utils/iframeUtils.ts` |
| React component | `components/IframeLoginHelper.tsx` |
| Config headers | `next.config.ts` |
| Cookie handling | `middleware.ts` |
| Login page | `app/auth/login/page.tsx` |
| Auth callback | `app/auth/callback/route.ts` |

## Quick Test HTML

```html
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
  <h1>Test</h1>
  <iframe id="frame" src="http://localhost:3000/auth/login" 
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
    style="width:100%; height:600px; border:1px solid #ccc;"></iframe>
  
  <script>
    window.addEventListener('message', e => {
      if (e.data.type === 'AUTH_COMPLETE') {
        console.log('✅ User logged in:', e.data.data)
      }
    })
  </script>
</body>
</html>
```

---

📚 See `IFRAME_LOGIN_GUIDE.md` for detailed documentation  
🧪 See `IFRAME_LOGIN_TEST_GUIDE.md` for testing instructions
