import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-simple-maps'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.guim.co.uk'     },
      { protocol: 'https', hostname: 'media.guim.co.uk' },
    ],
  },
};

export default nextConfig;
