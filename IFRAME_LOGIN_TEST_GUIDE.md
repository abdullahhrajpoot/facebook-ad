# Iframe Login - Quick Test Guide

## Quick Start Test (5 minutes)

### Test 1: Basic Iframe Embedding
```html
<!DOCTYPE html>
<html>
<head>
  <title>Iframe Login Test</title>
  <style>
    body { font-family: Arial; margin: 20px; }
    #login-iframe { width: 100%; height: 600px; border: 1px solid #ccc; }
    #messages { margin-top: 20px; padding: 10px; background: #f0f0f0; }
    .message { margin: 5px 0; padding: 5px; background: white; }
  </style>
</head>
<body>
  <h1>Login Iframe Test</h1>
  <iframe 
    id="login-iframe"
    src="http://localhost:3000/auth/login"
    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
  ></iframe>
  
  <div id="messages">
    <h3>Messages from iframe:</h3>
    <div id="log"></div>
  </div>

  <script>
    const log = document.getElementById('log')
    
    window.addEventListener('message', (event) => {
      console.log('Received message:', event.data)
      const message = document.createElement('div')
      message.className = 'message'
      message.textContent = JSON.stringify(event.data)
      log.appendChild(message)
    })
  </script>
</body>
</html>
```

### Test 2: Monitor Network & Cookies
1. Open your test HTML file in browser
2. Open DevTools (F12) → Application/Storage tab
3. Fill in login form and submit
4. Check:
   - **Cookies**: Should see auth-related cookies with `SameSite=None; Secure`
   - **Network**: Should see POST request to login endpoint
   - **Console**: Should see `AUTH_COMPLETE` message logged

### Test 3: Verify postMessage Communication
```javascript
// Run in parent window console
window.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_COMPLETE') {
    console.log('✅ Login successful!', event.data.data)
  }
})

// Send test message to iframe
const iframe = document.getElementById('login-iframe')
iframe.contentWindow.postMessage({ type: 'TEST' }, '*')
```

## Full Integration Test

### Setup Test Environment
```bash
# 1. Start your Next.js app
npm run dev
# App runs on http://localhost:3000

# 2. Create test-iframe.html in project root
# (use content from Test 1 above)

# 3. Open file:///path/to/project/test-iframe.html in browser
```

### Complete Test Checklist
- [ ] Page loads without CORS/security errors
- [ ] Can type email and password
- [ ] Form submission succeeds with valid credentials
- [ ] Browser console shows `AUTH_COMPLETE` message
- [ ] Message contains `userId` and `role`
- [ ] Cookies are set with `SameSite=None`
- [ ] Iframe can access stored session
- [ ] Refresh page - session persists

## Debugging Tips

### Check if headers are set correctly
```javascript
// In DevTools Network tab, click login POST request
// Headers tab → Response Headers should show:
// X-Frame-Options: ALLOWALL
// Content-Security-Policy: frame-ancestors 'self' *
```

### Verify cookies are created
```javascript
// In console
document.cookie  // Should show auth cookies
// OR: DevTools → Application → Cookies → localhost
```

### Monitor messages
```javascript
// Add this to parent window console
window.addEventListener('message', (e) => {
  console.log('Message received:', e.data)
  console.log('From origin:', e.origin)
  console.log('Window:', e.source === window.parent ? 'parent' : 'other')
})
```

### Check iframe access to cookies
```javascript
// In browser console (when iframe is loaded)
const iframe = document.querySelector('iframe')
try {
  console.log(iframe.contentDocument.cookie)
} catch (e) {
  console.error('Cannot access iframe cookies:', e.message)
}
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| CORS error on login | Missing headers | Headers in next.config.ts are applied |
| Cookies blocked | SameSite=Strict | Check middleware cookie settings |
| postMessage not received | Wrong origin | Use `*` for testing, validate origin in production |
| "Denying access to element" console warning | Sandbox restrictions | Add `allow-top-navigation` to iframe |
| Session lost on refresh | Third-party cookies disabled | Check browser cookie settings |
| Login works but no redirect | Iframe can't navigate parent | Add `allow-top-navigation-by-user-activation` |

## Production Checklist

Before deploying to production:
- [ ] Change CSP from `*` to specific allowed domains
- [ ] Change postMessage `'*'` to specific parent origin
- [ ] Enable HTTPS (already enforced in middleware)
- [ ] Validate all message origins
- [ ] Test with actual parent domain
- [ ] Monitor authentication logs
- [ ] Implement rate limiting per IP/email (already done)
- [ ] Set up security monitoring
