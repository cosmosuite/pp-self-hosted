/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'fs-extra']
  },
  webpack: (config) => {
    // Handle static file dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };
    return config;
  },
  // Configure API routes
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*'
      }
    ];
  },
  // Configure static file serving
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000' },
        ],
      },
      {
        source: '/outputs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000' },
        ],
      },
    ];
  },
}

module.exports = nextConfig;
