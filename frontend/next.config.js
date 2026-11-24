/** @type {import('next').NextConfig} */
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
    return {
      afterFiles: [{ source: '/backend-api/:path*', destination: api + '/:path*' }],
      // Public frontend images keep priority; legacy backend images are a fallback.
      fallback: [{ source: '/images/:path*', destination: new URL(api).origin + '/images/:path*' }],
    };
  },
};

// Keep production builds from replacing the chunks served by a running dev server.
module.exports = (phase) => ({
  ...nextConfig,
  distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
});
