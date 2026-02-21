/** @type {import('next').NextConfig} */
// Production build for Vercel
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: "memory" };
    }
    return config;
  },
};

module.exports = nextConfig;
