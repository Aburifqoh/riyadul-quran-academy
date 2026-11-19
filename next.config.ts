import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loader: 'custom',
    loaderFile: './src/lib/cloudflare-image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.icons8.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'wsrv.nl',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
