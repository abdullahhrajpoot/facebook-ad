/**
 * Example parent window component for handling iframe login
 * Use this as a reference for implementing iframe login in your parent application
 */

import React from 'react'

interface IframeLoginProps {
  loginUrl: string
  onAuthComplete?: (data: { userId: string; role: string }) => void
  onAuthError?: (error: string) => void
  width?: string
  height?: string
}

export function IframeLogin({
  loginUrl,
  onAuthComplete,
  onAuthError,
  width = '100%',
  height = '100%',
}: IframeLoginProps) {
  return (
    <IframeLoginContainer
      loginUrl={loginUrl}
      onAuthComplete={onAuthComplete}
      onAuthError={onAuthError}
      width={width}
      height={height}
    />
  )
}

function IframeLoginContainer({
  loginUrl,
  onAuthComplete,
  onAuthError,
  width,
  height,
}: IframeLoginProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // IMPORTANT: Validate origin in production
      // if (event.origin !== 'https://yourdomain.com') return

      if (event.data.type === 'AUTH_COMPLETE') {
        if (event.data.data.success) {
          onAuthComplete?.(event.data.data)
        } else {
          onAuthError?.(event.data.error || 'Authentication failed')
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [onAuthComplete, onAuthError])

  return (
    <div style={{ width, height }}>
      <iframe
        ref={iframeRef}
        src={loginUrl}
        title="Login Form"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '8px',
        }}
      />
    </div>
  )
}

/**
 * Usage in parent application:
 * 
 * function MyApp() {
 *   const handleAuthComplete = (data) => {
 *     console.log('User logged in:', data)
 *     // Store session, redirect, etc.
 *   }
 *   
 *   return (
 *     <IframeLogin
 *       loginUrl="https://yourdomain.com/auth/login?iframe=true"
 *       onAuthComplete={handleAuthComplete}
 *       onAuthError={(error) => console.error('Login failed:', error)}
 *     />
 *   )
 * }
 */

/**
 * Alternative: Plain JavaScript implementation for parent window
 */
export const IframeLoginHelper = {
  /**
   * Create and embed iframe
   */
  embedIframe(
    containerId: string,
    loginUrl: string,
    options: {
      width?: string
      height?: string
      sandbox?: string
    } = {}
  ) {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error(`Container with id "${containerId}" not found`)
      return
    }

    const iframe = document.createElement('iframe')
    iframe.src = loginUrl
    iframe.title = 'Login Form'
    iframe.sandbox.add(...(options.sandbox || 'allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation').split(' '))
    iframe.style.width = options.width || '100%'
    iframe.style.height = options.height || '100%'
    iframe.style.border = 'none'
    iframe.style.borderRadius = '8px'

    container.appendChild(iframe)
    return iframe
  },

  /**
   * Listen for authentication messages
   */
  onAuthComplete(
    callback: (data: { userId: string; role: string }) => void
  ): () => void {
    const handleMessage = (event: MessageEvent) => {
      // IMPORTANT: Validate origin in production
      // if (event.origin !== 'https://yourdomain.com') return

      if (event.data.type === 'AUTH_COMPLETE' && event.data.data.success) {
        callback(event.data.data)
      }
    }

    window.addEventListener('message', handleMessage)

    // Return cleanup function
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  },

  /**
   * Handle authentication errors
   */
  onAuthError(callback: (error: string) => void): () => void {
    const handleMessage = (event: MessageEvent) => {
      // IMPORTANT: Validate origin in production
      // if (event.origin !== 'https://yourdomain.com') return

      if (event.data.type === 'AUTH_COMPLETE' && !event.data.data.success) {
        callback(event.data.error || 'Authentication failed')
      }
    }

    window.addEventListener('message', handleMessage)

    // Return cleanup function
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  },

  /**
   * Send message to iframe
   */
  sendMessageToIframe(iframeElement: HTMLIFrameElement, message: any) {
    if (!iframeElement.contentWindow) {
      console.error('Cannot access iframe content window')
      return
    }
    iframeElement.contentWindow.postMessage(message, '*')
  },
}

/**
 * HTML + JavaScript Example:
 * 
 * <!DOCTYPE html>
 * <html>
 * <head>
 *   <title>Login</title>
 * </head>
 * <body>
 *   <div id="login-container"></div>
 *   
 *   <script>
 *     // Embed the login iframe
 *     IframeLoginHelper.embedIframe(
 *       'login-container',
 *       'https://yourdomain.com/auth/login?iframe=true'
 *     )
 *     
 *     // Handle successful login
 *     IframeLoginHelper.onAuthComplete((data) => {
 *       console.log('User logged in:', data)
 *       window.location.href = '/dashboard'
 *     })
 *     
 *     // Handle errors
 *     IframeLoginHelper.onAuthError((error) => {
 *       console.error('Login error:', error)
 *     })
 *   </script>
 * </body>
 * </html>
 */
