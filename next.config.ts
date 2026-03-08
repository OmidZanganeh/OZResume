import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['react-simple-maps'],
  serverExternalPackages: ['@imgly/background-removal', 'onnxruntime-web'],
};

export default nextConfig;
