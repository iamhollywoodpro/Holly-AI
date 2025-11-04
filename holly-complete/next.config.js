/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Force cache busting by adding build ID
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
}

module.exports = nextConfig
