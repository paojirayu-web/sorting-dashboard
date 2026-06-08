import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@napi-rs/canvas', 'puppeteer', 'form-data', 'node-cron'],
  turbopack: {
    root: __dirname,
  },
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
