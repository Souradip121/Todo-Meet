import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions are stable in Next.js 15
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
    ],
  },
}

export default nextConfig
