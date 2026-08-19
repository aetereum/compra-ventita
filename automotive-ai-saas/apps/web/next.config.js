/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@automotive/types', '@automotive/ui'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;