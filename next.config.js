/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark pdf-parse and pdfjs-dist as external to avoid webpack bundling issues
      config.externals = config.externals || [];
      config.externals.push('pdf-parse', 'canvas');
    }
    return config;
  },
}

module.exports = nextConfig
