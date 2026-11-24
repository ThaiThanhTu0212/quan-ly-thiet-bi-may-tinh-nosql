/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async rewrites() {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');
    return [{ source: '/backend-api/:path*', destination: api + '/:path*' }];
  },
};

module.exports = nextConfig;
