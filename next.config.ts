import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-simple-maps'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.guim.co.uk'     },
      { protocol: 'https', hostname: 'media.guim.co.uk' },
    ],
  },
  async redirects() {
    return [
      {
        source: '/tools/stock-screener',
        destination: '/web-apps/stock-screener',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
