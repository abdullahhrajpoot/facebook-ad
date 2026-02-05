# Iframe Login Implementation Guide

## Overview
Your app is now configured to work with login inside iframes. The following changes have been made to support this:

## Changes Made

### 1. **next.config.ts** - Security Headers
Added headers to allow framing from any origin:
- `X-Frame-Options: ALLOWALL` - Permits the app to be loaded in iframes
- `Content-Security-Policy: frame-ancestors 'self' *` - Allows framing from any origin

### 2. **middleware.ts** - Cookie Configuration
Updated cookie handling to support cross-origin iframe contexts:
- Sets `SameSite: None` for cookies (required for iframe cross-origin access)
- Sets `Secure: true` flag (required when using SameSite=None)
- Applied to all authentication cookie operations

### 3. **utils/iframeUtils.ts** - Iframe Utilities
New utility file with helper functions:
- `isInIframe()` - Detects if app is running in an iframe
- `postMessageToParent()` - Send messages to parent window
- `onMessageFromParent()` - Listen for parent window messages
- `iframeRedirect()` - Handle redirects in iframe context
- `notifyAuthenticationComplete()` - Notify parent of login status

### 4. **app/auth/login/page.tsx** - Login Page Updates
Enhanced login page to support iframe mode:
- Imports iframe utilities
- Detects iframe context on component mount
- Sends authentication completion notification to parent window
- Maintains normal redirect flow for iframe navigation

### 5. **app/auth/callback/route.ts** - Auth Callback Updates
Updated callback to handle iframe authentication:
- Accepts `iframe` query parameter for context awareness
- Applies secure cookie settings for iframe sessions
- Supports both standard and iframe authentication flows

## Usage

### Basic Iframe Implementation

```html
<!-- Parent Window -->
<iframe 
  src="https://yourdomain.com/auth/login"
  allow="camera; microphone"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
></iframe>
```

### Listen for Login Success from Parent

```javascript
// In parent window
window.addEventListener('message', (event) => {
  if (event.data.type === 'AUTH_COMPLETE') {
    console.log('User logged in:', event.data.data)
    // Handle successful login - maybe close iframe, redirect, etc.
    if (event.data.data.success) {
      const { userId, role } = event.data.data
      console.log(`User ${userId} logged in as ${role}`)
    }
  }
})
```

### Embed Login in Iframe with Parameters

```html
<iframe 
  src="https://yourdomain.com/auth/login?iframe=true"
  title="Login"
  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
  style="width: 100%; height: 100%; border: none;"
></iframe>
```

## Important Security Considerations

⚠️ **Critical:** Before deploying to production with open iframe access:

1. **Whitelist parent origins** (if needed):
   - Modify `Content-Security-Policy` to specific origins instead of `*`
   - Example: `frame-ancestors 'self' https://trusted-domain.com https://another-domain.com`

2. **Update postMessage** to use specific origins:
   - Replace `'*'` with specific parent origin: `window.parent.postMessage(message, 'https://parent-domain.com')`

3. **Validate incoming messages**:
   - Always validate message origin in parent window
   - Check message structure before processing

4. **Session Security**:
   - Sessions will be stored in third-party cookies (SameSite=None)
   - Ensure HTTPS is enforced (already configured in middleware)
   - Monitor for suspicious cross-origin access

## Testing

### Test in Development

```javascript
// Open browser DevTools console and test:

// Check if in iframe
console.log(window !== window.parent)

// Send test message to parent
window.parent.postMessage({ type: 'TEST', data: 'hello' }, '*')

// Listen for messages
window.addEventListener('message', e => console.log(e.data))
```

### Test Login Flow

1. Create an iframe pointing to `/auth/login`
2. Log in with valid credentials
3. Check browser console for `AUTH_COMPLETE` message
4. Verify cookies are set with `SameSite=None; Secure`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Cookies not persisting** | Ensure HTTPS is used; browser may block cookies on HTTP |
| **Login works but redirects fail** | Add `allow-top-navigation` to iframe sandbox attribute |
| **Parent can't receive messages** | Verify postMessage origin matches (use `*` for testing) |
| **Session lost on page refresh** | Check if third-party cookies are blocked in browser settings |
| **CORS errors** | X-Frame-Options and CSP should be resolved by current config |

## Configuration for Specific Domains

To restrict framing to specific domains, edit `next.config.ts`:

```typescript
headers: async () => {
  return [
    {
      source: '/:path*',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'ALLOW-FROM https://trusted-domain.com',
        },
        {
          key: 'Content-Security-Policy',
          value: "frame-ancestors 'self' https://trusted-domain.com https://other-domain.com",
        },
      ],
    },
  ];
}
```

## Next Steps

1. Test the iframe login in your environment
2. Customize domain restrictions as needed
3. Implement parent window communication handlers
4. Monitor authentication logs for unusual patterns
5. Update production CSP if restricting to specific domains
