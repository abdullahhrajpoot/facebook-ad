import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // Bypass Vercel's image optimization quota (402 errors)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fbcdn.net',
      },
      {
        protocol: 'https',
        hostname: '**.facebook.com',
      },
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Allow iframe embedding - using frame-ancestors only (doesn't affect images)
          // Note: frame-ancestors in CSP supersedes X-Frame-Options
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://app.ikonicmarketer.com https://app.ikonicmarketer.com/custom-menu-link/79ddf060-f8c5-46d1-9d0f-f5efa67916ba https://*.gohighlevel.com https://*.highlevel.com",
          },
          // Required for postMessage to work correctly with popups
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
        ],
      },
    ];
  },
};


export default nextConfig;
